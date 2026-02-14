<objective>
Fix three bugs in the Hypnewcade WebGL video synthesizer's shape/oscillator system:
1. Square waveform doesn't produce visually distinct output (looks identical to Sine)
2. Circle and Diamond waveforms revert to sine-like parallel bars when movement/phase offset is active
3. Oscillator blend modes only work one direction (Osc2→Osc1); Osc1's blend mode is ignored by the shader

Read `./CLAUDE.md` for project conventions, especially the preset migration rule and git commit rules. Each discrete fix should be its own atomic commit.
</objective>

<context>
This is a WebGL 2 video synthesizer (vanilla JS, no build tools) with two independent oscillators. Each oscillator generates fullscreen waveform patterns. The render pipeline is: feedback pass → shape pass (additive blend) → display pass.

Key files to examine:
- `./src/shaders/shape.frag` — Shape shader with `evaluateWaveform()` and `evaluateOscillator()` functions, plus the oscillator combine logic
- `./src/renderer.js` — Render loop that computes movement/phase offsets and passes uniforms
- `./src/main.js` — Uniform location setup
- `./src/params.js` — Parameter defaults and store
- `./src/ui.js` — UI controls including blend mode and waveform selectors

Waveform types (int enum): 0=Sine, 1=Tan, 2=Square, 3=Circle, 4=Diamond, 5=Triangle
Blend modes (int enum): 0=Add, 1=Multiply, 2=Mask, 3=Difference, 4=Phase Mod
</context>

<research>
Before making changes, thoroughly analyze these specific bugs:

**Bug 1 — Square waveform visually broken:**
Examine `evaluateWaveform()` in shape.frag. The Square case (waveform==2) uses `fract(t)` thresholded by `smoothstep(thickness - halfSoft, thickness + halfSoft, f)`. Compare this to the Sine path: `sin(t * TAU) * 0.5 + 0.5` then `smoothstep(1.0 - thickness - halfSoft, 1.0 - thickness + halfSoft, wave)`. At default thickness=0.5 and softness=0.02, BOTH produce alternating equal-width bright/dark bands with nearly identical appearance. The Square wave should produce a distinctly different visual — true binary on/off bands with a controllable duty cycle via thickness.

**Bug 2 — Circle/Diamond revert to sine-like shapes:**
In shape.frag's `main()`, the phase offset is applied as a UV translation (`uv1.x += osc1PhaseX; uv1.y += osc1PhaseY`) BEFORE calling `evaluateOscillator()`. For linear waveforms (Sine/Tan/Square), UV translation scrolls the pattern — correct behavior. For radial waveforms (Circle/Diamond), UV translation shifts the CENTER off-screen, and the outer rings of a far-off-center circle look like parallel bars (identical to sine). Similarly for Triangle (SDF-based), the translation shifts the tile grid. Movement should work differently for radial vs linear waveforms.

**Bug 3 — Blend modes one-directional:**
In shape.frag's combine section (around line 370), only `uOsc2BlendMode` is used. The `uOsc1BlendMode` uniform is declared but the comment says "reserved for future use" and it's never read in the combine logic. Both oscillators have blend mode selectors in the UI (ui.js `createOscBlendModeSelector()`), but Osc1's selector has no effect.
</research>

<requirements>

**Fix 1 — Square waveform (shape.frag):**
Rewrite the Square waveform to produce a visually distinct pattern. A proper square wave should:
- Create sharp binary alternating bands (hard on/off, no sine-like curvature)
- The `thickness` parameter should control duty cycle (0.1 = thin bright lines, 0.5 = equal bands, 0.9 = wide bright bars)
- The `softness` parameter should control edge blur
- It should look distinctly different from Sine at all settings
- Implementation hint: use `step()` or `mod(floor(t), 2.0)` for true binary alternation, then modulate with thickness for duty cycle control

**Fix 2 — Circle/Diamond/Triangle radial waveforms (shape.frag + renderer.js):**
Movement phase offsets should not shift the center of radial patterns off-screen. Instead:
- For Circle and Diamond: movement should modulate the radial distance (ring expansion/contraction), NOT translate the center point
- For Triangle: movement should scroll the tile grid, which UV translation already does correctly
- The phase offset applied in `main()` should be split: linear waveforms use UV translation (current behavior), radial waveforms use a different approach
- One clean approach: pass the phase offsets as separate uniforms and handle them inside `evaluateOscillator()` per waveform type. For Circle/Diamond, add phase to the distance metric (`t = dist * frequency + phaseOffset`) instead of translating UV. This preserves the concentric pattern while animating the rings.
- Alternatively: apply UV translation only for linear waveforms (0, 1, 2) and Triangle (5), and apply radial phase offset for Circle (3) and Diamond (4)

**Fix 3 — Bidirectional blend modes (shape.frag):**
Make both oscillators' blend modes functional. Each oscillator's blend mode determines how IT is affected by the other oscillator:
- Osc1 blend mode = "Mask" means "Osc1 is masked by Osc2" (Osc1 only shows where Osc2 is bright)
- Osc2 blend mode = "Add" means "Osc2 just adds independently" (no modulation from Osc1)
- Final output is the sum/combination of both processed contributions

Implementation approach for the combine section:
1. Compute Osc1's contribution based on Osc1's blend mode (how Osc1 is affected by Osc2):
   - Add: `osc1Color * osc1Shape` (unaffected)
   - Multiply: `osc1Color * osc1Shape * osc2Shape`
   - Mask: `osc1Color * osc1Shape * step(0.01, osc2Shape)`
   - Difference: `abs(osc1Color * osc1Shape - osc2Color * osc2Shape)`
   - Phase Mod: already handled (Osc2 modulates Osc1's phase during evaluation)
2. Compute Osc2's contribution based on Osc2's blend mode (how Osc2 is affected by Osc1):
   - Same logic but with osc1/osc2 swapped
3. Combine: `finalColor = osc1Contribution + osc2Contribution`
4. For Difference mode on both: take the average to avoid doubling
5. Phase Mod direction: If Osc1's blend mode is Phase Mod, evaluate Osc1 first and route into Osc2's phase. If both are Phase Mod, only Osc2→Osc1 applies (current behavior as tiebreaker). This may require restructuring the evaluation order in main() based on blend modes.

**Important:** The `uOsc1BlendMode` uniform already exists in the shader and is already passed from renderer.js. The UI already has Osc1 blend mode buttons. Only the shader's combine logic needs to change.

</requirements>

<constraints>
- Do NOT change any param names or defaults (no migration needed for bug fixes)
- Do NOT modify the UI (ui.js) for the bug fixes — only change shader and renderer code
- Maintain backward compatibility with existing presets — the visual output with both blend modes set to "Add" (default) should be identical to the current behavior
- Test that all 6 waveform types produce visually distinct output for both oscillators
- Test that movement modes work correctly with all waveform types (radial patterns should animate their rings, not shift off-screen)
- The shader must compile and run without errors on WebGL 2 (GLSL ES 3.00)
</constraints>

<output>
Modify these files:
- `./src/shaders/shape.frag` — Fix Square waveform, fix radial movement, implement bidirectional blend modes
- `./src/renderer.js` — If needed, adjust how phase offsets are passed to support per-waveform movement behavior

Do NOT create new files. Do NOT modify presets, params.js, or ui.js for these bug fixes.
</output>

<verification>
After each fix, verify:
1. All 6 waveforms produce visually distinct patterns (especially Square vs Sine)
2. Circle and Diamond show concentric rings that animate (expand/contract) with movement, NOT parallel bars
3. Both Osc1 and Osc2 blend mode selectors affect the output
4. With both blend modes set to "Add" (default), output matches current behavior
5. Phase Mod routing works in both directions
6. No GLSL compilation errors — check the browser console for shader compile warnings
7. Commit each discrete fix separately per CLAUDE.md git rules
</verification>

<success_criteria>
- Square waveform is visually distinct from Sine at all thickness/softness settings
- Circle waveform always shows concentric rings regardless of movement mode/phase
- Diamond waveform always shows concentric diamond shapes regardless of movement mode/phase
- Osc1 blend mode selector has visible effect on output when both oscillators are enabled
- Osc2 blend mode selector continues to work as before
- Default settings (both Add) produce identical output to current behavior
- Each bug fix is committed atomically per CLAUDE.md git rules
</success_criteria>
