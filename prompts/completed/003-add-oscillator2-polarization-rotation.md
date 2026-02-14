<objective>
Add three major features to the Hypnewcade video synthesizer:
1. A fully independent second oscillator with modular signal routing
2. Polarization control for the shape output
3. Rotation (angle) modulation driven by an internal LFO

These features are inspired by modular synthesis principles where any output can be "patched" to any input, regardless of where it lives in the signal chain.
</objective>

<context>
This is a WebGL 2 video synthesizer with a feedback loop architecture. Read ALL source files before implementing:

- `src/params.js` -- central parameter store with DEFAULTS, presets, getDefaults()
- `src/renderer.js` -- render loop with movement computation + 3-pass pipeline (feedback -> shape -> display)
- `src/ui.js` -- overlay control panel (sliders, button selectors, mode-dependent visibility)
- `src/shaders/shape.frag` -- fullscreen waveform oscillator (has uShapePhaseOffset and uShapePhaseOffsetY)
- `src/shaders/feedback.frag` -- feedback transform + decay + hue rotation + blend modes
- `src/shaders/composite.frag` -- display shader with color modes
- `src/main.js` -- initialization and uniform location gathering
- `src/gl.js` -- WebGL utilities
- `src/framebuffers.js` -- ping-pong buffer management

Previous prompts have:
- Fixed square waveform, Lissajous 2D motion, scroll angle, blend modes
- Added `uShapePhaseOffsetY` to the shape shader for 2D phase movement
- Added `movementLissajousRatio` parameter
- Made UI controls mode-dependent (show/hide based on selected modes)

Understand the existing patterns before adding new code.
</context>

<architecture>

<feature id="1">
<title>Second Oscillator (Oscillator 2)</title>

<design_philosophy>
The second oscillator should be a fully independent waveform generator with its own complete parameter set, rendered in a separate shader pass. The key architectural principle is **modular routing**: the user should be able to choose how Oscillator 2 combines with Oscillator 1.

Think of it like a modular synthesizer patch bay. Each oscillator produces a signal, and the user chooses a blend/modulation mode for how they interact.
</design_philosophy>

<blend_modes>
Oscillator 2 should support these combination modes with Oscillator 1:
- **Add** (default) -- additive blend, both oscillators contribute light independently
- **Multiply** -- Osc2 modulates Osc1's brightness (amplitude modulation / ring mod)
- **Mask** -- Osc2 acts as a stencil/mask, Osc1 only shows where Osc2 is bright
- **Difference** -- absolute difference between the two, creates interference patterns
- **Phase Mod** -- Osc2's brightness value is added to Osc1's phase input (FM synthesis analog)

The Phase Mod mode is the most "modular" -- it means Osc2's output is routed into Osc1's phase input, creating frequency modulation effects. This requires a multi-pass approach or a combined shader.
</blend_modes>

<implementation_approach>
Two approaches for the rendering pipeline, choose the most practical:

**Option A: Combined shader** (recommended for Phase Mod support)
- Modify shape.frag to evaluate BOTH oscillators in a single pass
- Add a full set of Osc2 uniforms (waveform, frequency, angle, thickness, softness, phase offset, hue, sat)
- Add a blend mode uniform that controls how they combine
- For Phase Mod: evaluate Osc2 first, then use its value to offset Osc1's phase input
- For other modes: evaluate both independently, then combine

**Option B: Separate shader pass**
- Create a second shape shader pass that renders Osc2 to an intermediate buffer
- Composite Osc1 and Osc2 using the chosen blend mode
- More flexible but requires an additional FBO and texture read
- Phase Mod would require reading Osc2's texture in Osc1's shader

Go with Option A (combined shader) for simplicity and Phase Mod support.
</implementation_approach>

<parameters>
Add these parameters to params.js DEFAULTS (all prefixed with `osc2`):
- `osc2Enabled`: 0 (boolean, 0=off, 1=on)
- `osc2Waveform`: 0 (same options as shapeWaveform: 0-5)
- `osc2Frequency`: 4.0
- `osc2Angle`: 0.0 (radians)
- `osc2Thickness`: 0.5
- `osc2Softness`: 0.02
- `osc2PhaseOffset`: 0.0
- `osc2Hue`: 0.5
- `osc2ColorSat`: 1.0
- `osc2BlendMode`: 0 (0=Add, 1=Multiply, 2=Mask, 3=Difference, 4=Phase Mod)
- `osc2MovementMode`: 5 (same options as movementMode, default Fixed)
- `osc2MovementSpeed`: 0.5
- `osc2MovementAmplitude`: 0.3
- `osc2MovementPhase`: 0.0
- `osc2FractalAmount`: 0
- `osc2FractalAngle`: 0.0
</parameters>

<ui_section>
Create a new "Oscillator 2" group in the UI panel (after Shape, before Movement):
- An enable/disable toggle button at the top
- Osc2 blend mode selector buttons (Add, Multiply, Mask, Difference, Phase Mod)
- Waveform selector buttons (same 6 types as Osc1)
- Movement mode selector buttons
- Parameter sliders (same mode-dependent visibility rules as Osc1's movement controls)
- When `osc2Enabled` is 0, collapse/hide the entire section except the toggle
</ui_section>
</feature>

<feature id="2">
<title>Polarization Control</title>

<design_philosophy>
Polarization controls the "direction" or axis of the waveform output. In analog video synthesis, a polarizer rotates the signal's spatial orientation continuously. Here, it should smoothly rotate the effective angle of the output pattern independently of the shape's own angle parameter.

The difference from shapeAngle: shapeAngle rotates the waveform pattern itself (applied before evaluation). Polarization rotates the UV space AFTER the waveform is evaluated, or applies a secondary angular transformation to the final shape output coordinate space.
</design_philosophy>

<implementation>
Add a polarization angle parameter that applies an additional UV rotation in the shape shader, AFTER fractal and mirror processing but BEFORE the waveform evaluation. This creates a "second rotation axis" that stacks with shapeAngle.

Alternatively (and more interestingly), polarization could rotate the OUTPUT coordinate mapping -- effectively rotating the brightness pattern after evaluation. This would mean:
1. Evaluate the waveform normally
2. Use the polarization angle to blend between the X-projected and Y-projected waveform evaluations

For implementation simplicity, add it as a pre-waveform UV rotation that stacks with shapeAngle:
- `polarizationAngle`: float, 0 to 2*PI
- Applied as an additional `rotateUV(uv, uPolarizationAngle)` call in the shape shader

This is distinct from shapeAngle because shapeAngle is part of the waveform itself (and can be animated by Spiral mode), while polarization is a separate spatial transform.
</implementation>

<parameters>
- `polarizationAngle`: 0.0 (0 to 2*PI)
- `polarizationSpeed`: 0.0 (auto-rotation speed, 0 = manual only)

Add to the Shape group in the UI, after the existing angle control.
</parameters>
</feature>

<feature id="3">
<title>Rotation Modulation (Angle LFO)</title>

<design_philosophy>
An internal Low Frequency Oscillator (LFO) that modulates the shape's rotation angle over time. This creates continuously evolving angular motion -- the pattern rotates back and forth or spins at varying speeds.

This is separate from the feedback rotation (which rotates the feedback buffer). This modulates the SHAPE's own angle, creating waveform rotation animation.
</design_philosophy>

<implementation>
Add an LFO in renderer.js that modulates `shapeAngle` before passing it as `angleOffset` to the shader:

1. LFO waveform options: Sine, Triangle, Sawtooth, Square, Random/S&H
2. LFO rate: frequency in Hz (0.01 to 5.0)
3. LFO depth: modulation amount in radians (0 to PI)
4. Compute the LFO value each frame in renderer.js and add it to `angleOffset`

The LFO is computed on the CPU side (in renderer.js), NOT in the shader. This keeps it simple and allows it to interact naturally with the movement system that already modifies angleOffset.
</implementation>

<parameters>
- `angleLFOEnabled`: 0 (boolean toggle)
- `angleLFOWaveform`: 0 (0=Sine, 1=Triangle, 2=Sawtooth, 3=Square, 4=Random S&H)
- `angleLFORate`: 0.5 (Hz, 0.01 to 5.0)
- `angleLFODepth`: 0.0 (radians, 0 to PI)

Add as a sub-section within the Shape group, after polarization controls.
When `angleLFOEnabled` is 0, collapse the LFO controls.
</parameters>
</feature>

</architecture>

<implementation_order>
Implement in this order due to dependencies:

1. **Polarization** -- simplest, adds to shape shader and params only
2. **Angle LFO** -- adds to renderer.js computation, depends on understanding angle flow
3. **Oscillator 2** -- largest change, modifies shape shader significantly, adds new UI group

For each feature:
a. Add parameters to params.js DEFAULTS
b. Add to ALL existing presets (use sensible defaults: disabled/zero for new features)
c. Add uniform locations to main.js
d. Add shader uniforms and implementation
e. Add renderer.js logic (for LFO and Osc2 movement)
f. Add UI controls to ui.js with proper mode-dependent visibility
g. Add randomization ranges to ui.js
</implementation_order>

<constraints>
- Maintain the existing 3-pass render pipeline (feedback -> shape -> display)
- The shape pass already uses additive blending onto the feedback buffer -- Osc2 combination should happen WITHIN the shape shader (before the additive blend to the FBO)
- Keep shader code GLSL ES 3.00 compatible
- Maintain smooth 60fps performance -- the combined oscillator shader should not be significantly more expensive
- Follow existing code patterns (naming conventions, uniform naming with `u` prefix, params naming)
- All new controls must follow the mode-dependent visibility pattern established in prompt 002
- Do NOT break any existing presets -- add new params with defaults that preserve current behavior
</constraints>

<verification>
Before declaring complete:

1. **Polarization**: Adjust polarization angle and verify it rotates the pattern independently of shapeAngle. Verify polarizationSpeed creates smooth auto-rotation.

2. **Angle LFO**: Enable the LFO, set depth to PI/4, rate to 0.5. Verify the shape angle oscillates smoothly. Test all 5 LFO waveform types.

3. **Oscillator 2**:
   - Enable Osc2, set to a different waveform than Osc1 (e.g., Osc1=Sine, Osc2=Circle)
   - Test ALL 5 blend modes:
     - Add: both patterns visible simultaneously
     - Multiply: Osc2 gates Osc1's brightness
     - Mask: Osc1 only appears where Osc2 is bright
     - Difference: interference pattern between the two
     - Phase Mod: Osc2 warps/distorts Osc1's shape (most dramatic effect)
   - Test Osc2's independent movement modes
   - Disable Osc2 and verify output matches pre-change behavior exactly

4. **UI**: Verify Osc2 section collapses when disabled. Verify all new controls follow visibility rules.

5. **Presets**: Load each preset and verify no errors. All presets should look the same as before (new features defaulting to off/zero).

6. **Performance**: Verify 60fps is maintained with both oscillators active.
</verification>

<success_criteria>
- Two fully independent oscillators with 5 combination modes
- Polarization creates a distinct spatial rotation separate from shape angle
- Angle LFO creates smooth, configurable angular modulation
- All new features default to off/zero, preserving existing behavior
- UI is clean with mode-dependent visibility for all new controls
- No performance regression
- All existing presets work unchanged
</success_criteria>
