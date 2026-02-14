<objective>
Refactor the Hypnewcade video synthesizer so that Oscillator 1 and Oscillator 2 have complete feature parity, restructure the UI with oscillator sub-tabs, extract a global Color section, and write the corresponding preset migration.

Currently Osc1 has features Osc2 lacks (polarization, angle LFO) and vice versa (blend mode, enable toggle, dedicated movement). This refactor makes both oscillators fully symmetric, gives each its own movement/color/modulation controls, and reorganizes the UI for clarity.
</objective>

<context>
Read ALL source files before implementing. The codebase has been modified by previous prompts:

- `src/params.js` -- DEFAULTS with current params (shape*, osc2*, movement*, polarization*, angleLFO*, color*)
- `src/renderer.js` -- render loop with movement computation, LFO, polarization for Osc1; basic movement for Osc2
- `src/ui.js` -- overlay panel with Controls/Presets tabs, mode-dependent visibility, oscillator sections
- `src/shaders/shape.frag` -- evaluates both oscillators in single pass, Osc2 blend modes
- `src/main.js` -- initialization
- `index.html` -- CSS styles
- `src/migrations/index.js` -- migration runner with CURRENT_VERSION
- `src/migrations/001-initial.js` -- baseline migration
- `src/preset-store.js` -- IndexedDB storage with migration support
- `src/presets/*.json` -- 7 built-in preset files (version 1)
- `CLAUDE.md` -- project rules including preset migration requirement

**CRITICAL**: Per the CLAUDE.md preset migration rule, this refactor MUST include a migration (002) that transforms old presets to the new parameter schema. Read CLAUDE.md before starting.
</context>

<research>
Before implementing, thoroughly analyze the current state by reading all files listed above. Build a complete mental model of:

1. Every parameter in DEFAULTS and which oscillator/system it belongs to
2. Every uniform in shape.frag and how it maps to params
3. Every UI control and which group it's in
4. The renderer's movement computation flow for both oscillators
5. The migration system structure

Then plan the parameter rename/add/remove mapping carefully before writing any code.
</research>

<parameter_changes>

<rename_mapping>
The core principle: Osc1 params move from the current mixed naming to a consistent `osc1*` prefix pattern. Osc2 params already use `osc2*` prefix. Shared global params stay as-is or move to explicit global names.

**Osc1 renames** (shape* → osc1*):
- `shapeWaveform` → `osc1Waveform`
- `shapeFrequency` → `osc1Frequency`
- `shapeAngle` → `osc1Angle`
- `shapeThickness` → `osc1Thickness`
- `shapeSoftness` → `osc1Softness`
- `shapePhaseOffset` → `osc1PhaseOffset`
- `shapeFractalAmount` → `osc1FractalAmount`
- `shapeFractalAngle` → `osc1FractalAngle`
- `shapeHue` → `osc1Hue`
- `shapeColorSat` → `osc1ColorSat`

**Movement renames** (shared movement* → osc1Movement*):
- `movementMode` → `osc1MovementMode`
- `movementAmplitude` → `osc1MovementAmplitude`
- `movementPhase` → `osc1MovementPhase`
- `movementSpeed` → `osc1MovementSpeed`
- `movementLissajousRatio` → `osc1MovementLissajousRatio`
- `movementSpiralSpeed` → `osc1MovementSpiralSpeed`
- `movementScrollAngle` → `osc1MovementScrollAngle`
- `movementScrollSpeed` → `osc1MovementScrollSpeed`
- `movementBounceSpeed` → `osc1MovementBounceSpeed`

**Polarization/LFO renames** (→ osc1*):
- `polarizationAngle` → `osc1PolarizationAngle`
- `polarizationSpeed` → `osc1PolarizationSpeed`
- `angleLFOEnabled` → `osc1AngleLFOEnabled`
- `angleLFOWaveform` → `osc1AngleLFOWaveform`
- `angleLFORate` → `osc1AngleLFORate`
- `angleLFODepth` → `osc1AngleLFODepth`
</rename_mapping>

<new_params>
**New Osc1 params** (features Osc2 had but Osc1 lacked):
- `osc1Enabled`: 1 (default ON, unlike Osc2 which defaults OFF)
- `osc1BlendMode`: 0 (Add -- Osc1 blends additively onto feedback by default)

**New Osc2 params** (features Osc1 had but Osc2 lacked):
- `osc2PolarizationAngle`: 0.0
- `osc2PolarizationSpeed`: 0.0
- `osc2AngleLFOEnabled`: 0
- `osc2AngleLFOWaveform`: 0
- `osc2AngleLFORate`: 0.5
- `osc2AngleLFODepth`: 0.0
- `osc2MovementLissajousRatio`: 0.5
- `osc2MovementSpiralSpeed`: 1.0
- `osc2MovementScrollAngle`: 0.0
- `osc2MovementScrollSpeed`: 0.5
- `osc2MovementBounceSpeed`: 0.3

Note: Some of these were previously hardcoded in renderer.js for Osc2. Now they become actual params.
</new_params>

<removed_params>
The old param names listed in rename_mapping are removed (they become the new osc1* names). No conceptual features are removed.
</removed_params>

<global_color_params>
These stay as global (unchanged names), they affect the entire output:
- `hueRotationSpeed` -- feedback hue cycling rate
- `baseBrightness` -- display pass brightness
- `saturation` -- display pass saturation
- `colorMode` -- Direct/Gradient/Posterize/Negative/Thermal
- `colorPosterizeLevels` -- posterize mode levels
- `colorGradientHue1`, `colorGradientHue2`, `colorGradientHue3` -- gradient hues

These are already in the composite/feedback shaders and are truly global. They stay in a "Color" section under Feedback.
</global_color_params>

</parameter_changes>

<shader_changes>
<title>shape.frag modifications</title>
<details>
1. **Add Osc1 enable/blend uniforms**: `uOsc1Enabled` (int), `uOsc1BlendMode` (int)
2. **Add Osc2 polarization uniform**: `uOsc2PolarizationAngle` (float)
3. **Rename Osc1 uniforms** to match new param names (the `u` prefix + param name pattern):
   - The actual GLSL uniform names can stay as-is (e.g., `uShapeWaveform`) OR be renamed to `uOsc1Waveform`. Choose consistency: rename them all to `uOsc1*` to match the params.
   - Update ALL references in the shader accordingly.
4. **Apply polarization to Osc2**: Add `rotateUV(uv2, uOsc2PolarizationAngle)` in the Osc2 evaluation path, mirroring the Osc1 polarization logic.
5. **Apply Osc1 enable/blend logic**: When `uOsc1Enabled == 0`, skip Osc1 evaluation. Apply Osc1 blend mode the same way Osc2's blend modes work (but Osc1 blends with the feedback buffer, Osc2 blends with Osc1's result).

Think carefully about the blend order:
- If BOTH oscillators are enabled, the output should be: `combine(osc1Result, osc2Result, osc2BlendMode)` then that combined result is additively blended onto the feedback buffer.
- If only Osc1 enabled: just Osc1 result, additively blended.
- If only Osc2 enabled: just Osc2 result, additively blended.
- Osc1's blend mode controls how it combines with... what? Since Osc1 is the "base", its blend mode could control how it combines with the feedback buffer (via GL blend func), or it could be a visual characteristic. For simplicity: Osc1BlendMode is reserved for future use (or controls Osc1's relationship to the feedback), and Osc2BlendMode controls how Osc2 combines with Osc1. Keep the existing Osc2 blend logic as-is.
</details>
</shader_changes>

<renderer_changes>
<title>renderer.js modifications</title>
<details>
1. **Update all param references** from old names to new `osc1*` names
2. **Add Osc2 angle LFO**: Duplicate the `_computeAngleLFO` logic for Osc2 using `osc2AngleLFO*` params. Add `_osc2SHValue`/`_osc2SHTime` state for Osc2's S&H LFO.
3. **Add Osc2 polarization**: Compute `osc2PolarizationAngle` with speed auto-rotation, same as Osc1.
4. **Fix Osc2 movement hardcodes**: Replace hardcoded values with actual params:
   - `lissajousRatio: 0.5` → `lissajousRatio: p.osc2MovementLissajousRatio`
   - `spiralSpeed: 1.0` → `spiralSpeed: p.osc2MovementSpiralSpeed`
   - `scrollAngle: 0.0` → `scrollAngle: p.osc2MovementScrollAngle`
   - `scrollSpeed: p.osc2MovementSpeed` → `scrollSpeed: p.osc2MovementScrollSpeed`
   - `bounceSpeed: p.osc2MovementSpeed` → `bounceSpeed: p.osc2MovementBounceSpeed`
5. **Add Osc1 enable check**: Wrap Osc1 computation in `if (p.osc1Enabled)` check.
6. **Pass new uniforms**: `uOsc1Enabled`, `uOsc1BlendMode`, `uOsc2PolarizationAngle`, and all renamed uniform names.
7. **Update uniform location names in main.js** to match renamed shader uniforms.
</details>
</renderer_changes>

<ui_changes>
<title>UI restructuring</title>
<details>
The Controls tab layout should become:

```
[Controls] [Presets]     ← top-level tabs (existing)
─────────────────────────
Action buttons (Randomize, Reset, Fullscreen)

── Feedback ──           ← always visible
   Mirror Mode buttons
   Mirror Target buttons
   Feedback Blend Mode buttons
   Sliders: Rotation, Zoom, X/Y Shift, Decay, Kal Angle

── Color ──              ← NEW global section, always visible
   Color Mode buttons
   Sliders: Hue Speed, Brightness, Saturation
   Conditional: Posterize Levels, Gradient Hue 1/2/3

── Oscillators ──        ← section header
   [Osc 1] [Osc 2]      ← oscillator sub-tabs
   ┌─────────────────┐
   │ Enable toggle    │
   │ Blend Mode btns  │
   │ Waveform btns    │
   │ Shape sliders:   │
   │   Freq, Angle,   │
   │   Thickness,     │
   │   Softness,      │
   │   Phase Offset   │
   │ Polarization:    │
   │   Angle, Speed   │
   │ Fractal:         │
   │   Amount, Angle  │
   │ Angle LFO:       │
   │   Toggle + ctrls │
   │ Per-osc Color:   │
   │   Hue, Color Sat │
   │ Movement:        │
   │   Mode buttons   │
   │   Mode-dependent │
   │   sliders        │
   └─────────────────┘
```

Key points:
- **Feedback** stays at the top, always visible regardless of oscillator tab
- **Color** (global output) is a NEW section below Feedback, always visible. Move `hueRotationSpeed`, `baseBrightness`, `saturation`, `colorMode`, `colorPosterizeLevels`, `colorGradientHue*` here. Remove the old "Color" group from the bottom.
- **Oscillator sub-tabs** switch between Osc1 and Osc2 controls. Each tab has IDENTICAL control structure.
- The old "Shape", "Oscillator 2", "Movement" groups are REPLACED by the oscillator sub-tabs.
- Each oscillator tab contains its own: enable toggle, blend mode, waveform, shape params, polarization, fractal, angle LFO, per-osc hue/sat, movement mode + sliders.
- Mode-dependent visibility works per-oscillator: each tab tracks its own movement mode and shows/hides accordingly.
- `osc1Hue`/`osc1ColorSat` and `osc2Hue`/`osc2ColorSat` appear inside their respective oscillator tabs as "Osc Color" controls. These control per-oscillator tinting. The global Color section's brightness/saturation/mode affect the final composited output.
</details>
</ui_changes>

<migration>
<title>Write migration 002</title>
<details>
Create `src/migrations/002-oscillator-parity.js`:

```js
export default {
  version: 2,
  description: 'Rename shape/movement params to osc1 prefix, add parity params for both oscillators',
  migrate(preset) {
    const p = preset.params;

    // Rename shape* → osc1*
    const renames = {
      shapeWaveform: 'osc1Waveform',
      shapeFrequency: 'osc1Frequency',
      shapeAngle: 'osc1Angle',
      shapeThickness: 'osc1Thickness',
      shapeSoftness: 'osc1Softness',
      shapePhaseOffset: 'osc1PhaseOffset',
      shapeFractalAmount: 'osc1FractalAmount',
      shapeFractalAngle: 'osc1FractalAngle',
      shapeHue: 'osc1Hue',
      shapeColorSat: 'osc1ColorSat',
      // Movement → osc1Movement
      movementMode: 'osc1MovementMode',
      movementAmplitude: 'osc1MovementAmplitude',
      movementPhase: 'osc1MovementPhase',
      movementSpeed: 'osc1MovementSpeed',
      movementLissajousRatio: 'osc1MovementLissajousRatio',
      movementSpiralSpeed: 'osc1MovementSpiralSpeed',
      movementScrollAngle: 'osc1MovementScrollAngle',
      movementScrollSpeed: 'osc1MovementScrollSpeed',
      movementBounceSpeed: 'osc1MovementBounceSpeed',
      // Polarization/LFO → osc1*
      polarizationAngle: 'osc1PolarizationAngle',
      polarizationSpeed: 'osc1PolarizationSpeed',
      angleLFOEnabled: 'osc1AngleLFOEnabled',
      angleLFOWaveform: 'osc1AngleLFOWaveform',
      angleLFORate: 'osc1AngleLFORate',
      angleLFODepth: 'osc1AngleLFODepth',
    };

    for (const [oldKey, newKey] of Object.entries(renames)) {
      if (oldKey in p) {
        p[newKey] = p[oldKey];
        delete p[oldKey];
      }
    }

    // Add new Osc1 params with defaults
    if (!('osc1Enabled' in p)) p.osc1Enabled = 1;
    if (!('osc1BlendMode' in p)) p.osc1BlendMode = 0;

    // Add new Osc2 params with defaults
    if (!('osc2PolarizationAngle' in p)) p.osc2PolarizationAngle = 0.0;
    if (!('osc2PolarizationSpeed' in p)) p.osc2PolarizationSpeed = 0.0;
    if (!('osc2AngleLFOEnabled' in p)) p.osc2AngleLFOEnabled = 0;
    if (!('osc2AngleLFOWaveform' in p)) p.osc2AngleLFOWaveform = 0;
    if (!('osc2AngleLFORate' in p)) p.osc2AngleLFORate = 0.5;
    if (!('osc2AngleLFODepth' in p)) p.osc2AngleLFODepth = 0.0;
    if (!('osc2MovementLissajousRatio' in p)) p.osc2MovementLissajousRatio = 0.5;
    if (!('osc2MovementSpiralSpeed' in p)) p.osc2MovementSpiralSpeed = 1.0;
    if (!('osc2MovementScrollAngle' in p)) p.osc2MovementScrollAngle = 0.0;
    if (!('osc2MovementScrollSpeed' in p)) p.osc2MovementScrollSpeed = 0.5;
    if (!('osc2MovementBounceSpeed' in p)) p.osc2MovementBounceSpeed = 0.3;

    preset.version = 2;
    return preset;
  }
};
```

Update `src/migrations/index.js`:
- Import `002-oscillator-parity.js`
- Add it to the migrations array
- Set `CURRENT_VERSION = 2`

Update ALL 7 built-in preset JSON files to version 2 with the new param names and added params.
</details>
</migration>

<main_js_changes>
<title>main.js uniform location updates</title>
<details>
Update the uniform location name arrays to match renamed shader uniforms. All `uShape*` become `uOsc1*`. Add new uniforms for Osc1 enable/blend and Osc2 polarization.
</details>
</main_js_changes>

</parameter_changes>

<constraints>
- No external libraries or build tools. Pure vanilla JS with ES modules.
- Do NOT modify shader files other than shape.frag (feedback.frag and composite.frag stay as-is since they use global color params that aren't changing names)
- Do NOT modify gl.js or framebuffers.js
- The migration (002) MUST correctly transform all old param names to new ones
- Built-in preset JSON files must be updated to version 2 with new param names
- The CLAUDE.md migration rule must be followed (this is the first real test of it)
- Osc1 with default settings after migration must produce identical output to pre-refactor
- All existing keyboard shortcuts and UI behaviors must be preserved
- The Presets tab (Factory/My Presets) must continue working -- preset cards load properly with migrated params
</constraints>

<verification>
Before declaring complete:

1. **Parameter parity**: Compare Osc1 and Osc2 params in DEFAULTS -- they should have mirror-image param sets (osc1* and osc2*)
2. **UI symmetry**: Switch between Osc1 and Osc2 tabs -- controls should be identical in structure
3. **Global Color section**: Appears below Feedback, contains color mode + brightness/saturation/hue speed
4. **Per-osc Color**: Each oscillator tab has Hue and Color Sat controls
5. **Osc1 enable toggle**: Can disable Osc1 (screen goes dark except Osc2 if enabled)
6. **Osc2 polarization**: Works the same as Osc1's polarization
7. **Osc2 angle LFO**: Works the same as Osc1's angle LFO
8. **Osc2 movement parity**: Lissajous ratio, spiral speed, scroll angle, scroll speed, bounce speed all have working sliders instead of hardcoded values
9. **Migration 002**: A v1 preset with old `shape*`/`movement*` names gets correctly migrated to v2 with `osc1*` names
10. **Built-in presets**: All 7 JSON files are at version 2 with correct param names
11. **Factory presets**: Load correctly from Presets tab, apply params, visualization matches expected
12. **No regressions**: Default params produce the same visual output as before refactor
13. **Randomize/Reset**: Use new param names correctly
</verification>

<success_criteria>
- Osc1 and Osc2 have complete feature parity (enable, blend mode, waveform, shape params, movement, polarization, LFO, fractal, per-osc color)
- UI has Feedback → Color → Oscillators (tabbed Osc1/Osc2) layout
- Global Color section affects entire output without overriding per-osc colors
- Migration 002 correctly transforms old presets to new schema
- All built-in presets updated to version 2
- CLAUDE.md migration rule followed
- Zero visual regressions with default settings
</success_criteria>
