<objective>
Fix all broken controls and shader bugs in the Hypnewcade video synthesizer. Several controls are non-functional due to implementation bugs, missing code paths, or identical shader logic. This prompt addresses only bug fixes -- no new features or UI restructuring.
</objective>

<context>
This is a WebGL 2 video synthesizer with a feedback loop architecture:
- `src/params.js` -- central parameter store
- `src/renderer.js` -- render loop, computes movement/phase, passes uniforms
- `src/ui.js` -- overlay control panel with sliders and button selectors
- `src/shaders/shape.frag` -- fullscreen waveform oscillator
- `src/shaders/feedback.frag` -- feedback transform + decay + hue rotation + blend modes
- `src/shaders/composite.frag` -- display shader with color modes
- `src/main.js` -- initialization, uniform location gathering

Read all of these files thoroughly before making any changes. Understand the full data flow from params -> renderer -> uniforms -> shaders.
</context>

<bugs>

<bug id="1" severity="high">
<title>Square waveform is identical to Tan waveform</title>
<location>src/shaders/shape.frag, evaluateWaveform function, lines 155-158</location>
<problem>
Both Tan (case 1) and Square (case 2) use `wave = fract(t)` -- identical code. Square produces the same sawtooth ramp as Tan instead of hard on/off bands.
</problem>
<fix>
Square wave should produce alternating on/off bands. Replace the Square case with proper square wave logic:
`wave = step(thickness, fract(t))` or equivalent. The key is that Square should produce hard binary bands (with softness controlling edge transition), NOT a ramp like fract().

Note: Since evaluateWaveform already applies thickness via smoothstep after the wave computation, the Square case should set `wave` to a value that creates sharp alternating bands BEFORE the thickness/softness processing. Consider whether the existing smoothstep post-processing is appropriate for square or if square needs its own return path.
</fix>
</bug>

<bug id="2" severity="high">
<title>Lissajous movement is identical to Sine movement</title>
<location>src/renderer.js, _tick method, lines 99-104</location>
<problem>
Mode 0 (Sine): `phaseOffset += amp * Math.sin(elapsed * speed * TAU)`
Mode 1 (Lissajous): `phaseOffset += amp * Math.sin(elapsed * speed * TAU + p.movementPhase)`

The only difference is `+ p.movementPhase`, which defaults to 0.0 making them identical. Even with non-zero movementPhase, this is still 1D oscillation -- NOT a Lissajous pattern. A true Lissajous requires two independent oscillation axes (X and Y) at potentially different frequencies with a phase relationship.
</problem>
<fix>
Implement proper 2D Lissajous motion. This requires architectural changes:

1. The shape shader currently takes a single `uShapePhaseOffset` uniform. For 2D Lissajous, we need to modulate the waveform coordinate in TWO dimensions. Add a second uniform `uShapePhaseOffsetY` to the shape shader.

2. In the shape shader's main function, for linear waveforms (Sine/Tan/Square), the current code projects onto X axis only:
   `float coord = (uv.x - 0.5) * aspect;`
   For 2D movement, we need to apply phase offsets to BOTH axes before the waveform coordinate projection. Apply `uShapePhaseOffset` to the X axis and `uShapePhaseOffsetY` to the Y axis (as UV translation before rotation).

3. For radial waveforms (Circle/Diamond), apply X and Y phase offsets as center displacement.

4. In renderer.js, compute TWO phase offsets for Lissajous mode:
   - phaseOffsetX = amp * Math.sin(elapsed * speed * TAU)
   - phaseOffsetY = amp * Math.sin(elapsed * speed * TAU * ratio + p.movementPhase)
   Where `ratio` could be a new parameter (e.g. `movementLissajousRatio`, default 0.5) or derived from existing params.

5. For all OTHER movement modes, set phaseOffsetY = 0 (they remain 1D).

6. Add the new uniform to main.js uniform location list and pass it in renderer.js.

7. Add `movementLissajousRatio` to params.js DEFAULTS (default: 0.5) and to all presets. Add a slider in ui.js CONTROL_DEFS for it in the Movement group.
</fix>
</bug>

<bug id="3" severity="medium">
<title>Scroll angle parameter is defined but never used</title>
<location>src/renderer.js, _tick method, case 3 (Scroll mode), lines 113-118</location>
<problem>
`movementScrollAngle` is defined in params.js, has a slider in ui.js, and has randomization ranges, but is NEVER READ in renderer.js. The Scroll mode only uses `movementScrollSpeed` for a 1D phase increment. The scroll direction is always the same regardless of the angle setting.
</problem>
<fix>
Implement scroll angle to control the direction of scrolling. In Scroll mode (case 3):

For linear waveforms, scrollAngle should rotate the scroll direction. Since the shape shader already has angle-based UV rotation, one approach is to modify the angleOffset in addition to phaseOffset:
- `angleOffset = p.movementScrollAngle` (set the waveform angle to match scroll direction)
- `phaseOffset += elapsed * p.movementScrollSpeed` (scroll along that direction)

However, this would override the user's shapeAngle setting. A better approach: use both X and Y phase offsets (from bug #2 fix) to scroll in an arbitrary direction:
- `phaseOffsetX += elapsed * p.movementScrollSpeed * Math.cos(p.movementScrollAngle)`
- `phaseOffsetY += elapsed * p.movementScrollSpeed * Math.sin(p.movementScrollAngle)`

This naturally composes with the shape's own angle setting.
</fix>
</bug>

<bug id="4" severity="medium">
<title>Screen, Soft Burn, and Freeze blend modes appear identical</title>
<location>src/shaders/feedback.frag, main function, lines 119-132</location>
<problem>
While the GLSL formulas ARE different, their visual output is too similar with typical parameter values:

- Screen: `1.0 - (1.0 - color) * uDecay` with uDecay=0.97 yields values very close to the input
- Soft Burn: `pow(color, vec3(1.0 / max(uDecay, 0.01)))` with uDecay=0.97 yields `pow(color, 1.03)` -- nearly identity
- Freeze: `color` with no modification -- but since additive shape blending keeps pumping brightness in, everything saturates to white anyway

The modes need more dramatic visual differentiation.
</problem>
<fix>
Redesign the blend modes to produce clearly distinct visual behavior:

1. **Multiply** (mode 0) -- keep as-is: `color * uDecay`. Trails fade to black. This is the classic behavior.

2. **Screen** (mode 1) -- should create bright, glowing trails that fade toward white instead of black. Rework the formula to be more dramatic:
   `vec3 result = 1.0 - (1.0 - color) * uDecay;`
   This is mathematically correct for screen blending with decay, but `uDecay` close to 1.0 makes it subtle. Consider mapping the decay parameter differently for this mode (e.g., use `uDecay * uDecay` or a stronger falloff) so the user can see the difference clearly at the same decay slider position.

3. **Soft Burn** -- should create a warm, saturating glow effect distinct from both Multiply and Screen. Consider:
   - A formula that enhances mid-tones while crushing shadows/highlights differently
   - Example: `mix(color * uDecay, sqrt(color) * uDecay, 0.5)` or use an S-curve
   - The key visual: trails should bloom and have a different color temperature than Multiply

4. **Freeze** (mode 3) -- trails should persist indefinitely. The current `color` pass-through is correct in principle, but the additive shape blending overwhelms it. Consider:
   - Apply a very slight decay (like 0.999) to prevent total saturation
   - Or clamp the output: `min(color, vec3(0.95))` to leave headroom for new shapes
   - The key visual: once drawn, patterns should persist almost forever with minimal fading
</fix>
</bug>

</bugs>

<implementation>
1. Read ALL source files listed in the context section before making changes.
2. Fix bugs in order: #1 (Square), then #2 (Lissajous + Y phase offset), then #3 (Scroll angle -- depends on Y phase offset from #2), then #4 (blend modes).
3. When adding `uShapePhaseOffsetY` for bug #2:
   - Add it to the shape shader uniforms
   - Add it to the uniform location list in main.js
   - Pass it from renderer.js
   - Apply it in shape.frag's main function for all waveform types
4. When adding `movementLissajousRatio`:
   - Add to DEFAULTS in params.js with default 0.5
   - Add to ALL existing presets (use musically interesting ratios: 0.5, 0.667, 0.75, etc.)
   - Add to CONTROL_DEFS in ui.js (label: 'Lissajous Ratio', min: 0.1, max: 3.0, step: 0.01, group: 'Movement')
   - Add to RANDOM_RANGES in ui.js
5. Ensure all existing presets continue to work correctly after changes.
6. Do NOT restructure the UI (that's the next prompt). Just add new controls alongside existing ones.
</implementation>

<verification>
Before declaring complete:
1. Verify Square waveform produces visually distinct hard on/off bands (not a sawtooth ramp like Tan)
2. Verify Lissajous mode produces visible 2D motion different from Sine (test with movementPhase = PI/2)
3. Verify Scroll mode changes direction when movementScrollAngle is adjusted
4. Verify each blend mode (Multiply/Screen/Soft Burn/Freeze) produces visually distinct feedback behavior
5. Verify all presets still load without errors and include new parameter values
6. Check browser console for any WebGL uniform warnings
</verification>

<success_criteria>
- All 6 waveform types produce visually distinct patterns
- All 6 movement modes behave differently and their associated parameters have visible effect
- All 4 blend modes produce clearly different visual feedback behavior
- No regressions in existing functionality
- All presets updated with new parameters
</success_criteria>
