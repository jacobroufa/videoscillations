<objective>
Expand the shape movement system from simple sine wave oscillation to a rich set of movement patterns. Currently the shape center follows independent X/Y sine waves, which produces basic oscillating motion. The Hypno hardware supports various movement modes including Lissajous curves, spiral paths, directional scrolling, and bounce patterns.

This adds a movement mode selector and the parameters needed for each pattern, giving the performer much more expressive control over how shapes traverse the screen.
</objective>

<context>
Read all existing source files before making changes (the codebase now includes shape variety and expanded color from previous prompts):

@./src/renderer.js - The render loop calculates shape center position (cx, cy) using sine waves. This is where movement patterns are computed in JavaScript and passed as uniforms.
@./src/params.js - Central parameter store
@./src/ui.js - Overlay UI
@./src/main.js - Entry point

Currently the shape position is calculated in renderer.js:
```js
const cx = 0.5 + 0.3 * Math.sin(elapsed * p.shapeFreqX * Math.PI * 2);
const cy = 0.5 + 0.3 * Math.sin(elapsed * p.shapeFreqY * Math.PI * 2);
```

This lives in JavaScript (not the shader) because it feeds into the uniform `uShapeCenter`. New movement patterns should follow the same approach: compute position in JS, pass as uniform. The shader doesn't need to change for movement (it already receives center as a uniform).
</context>

<requirements>
1. **Movement mode selector**: New integer param `movementMode` (0-5):
   - **0 - Sine oscillation** (current behavior): Independent X/Y sine waves. Uses existing `shapeFreqX` and `shapeFreqY`.
   - **1 - Lissajous**: X = sin(a*t), Y = sin(b*t + phase). Creates figure-8s, loops, and complex curves. New params: `movementPhase` (phase offset between X and Y oscillators, 0 to 2PI). Uses existing freqX/freqY for the a/b ratio.
   - **2 - Spiral**: Shape spirals outward from (or inward to) center. New params: `movementSpiralSpeed` (angular speed), `movementSpiralExpand` (rate of radius increase per revolution). Position: `x = 0.5 + r*cos(t*speed)`, `y = 0.5 + r*sin(t*speed)` where r grows/shrinks over time.
   - **3 - Directional scroll**: Shape moves in a constant direction and wraps at screen edges. New params: `movementScrollAngle` (direction in radians), `movementScrollSpeed` (pixels/sec normalized). Position wraps using modulo.
   - **4 - Bounce**: Shape bounces off screen edges like a screensaver. Internal state tracks position and velocity. New param: `movementBounceSpeed`.
   - **5 - Fixed center**: Shape stays at center (0.5, 0.5). Useful for tunnel/mandala effects with rotation feedback. No additional params needed.

2. **New parameters in params.js**:
   - `movementMode: 0` (integer)
   - `movementAmplitude: 0.3` (how far from center the shape travels, 0-0.5)
   - `movementPhase: 0.0` (Lissajous phase offset, 0 to 6.283)
   - `movementSpiralSpeed: 1.0` (spiral angular speed)
   - `movementSpiralExpand: 0.1` (spiral growth rate)
   - `movementScrollAngle: 0.0` (scroll direction, 0 to 6.283)
   - `movementScrollSpeed: 0.5` (scroll speed)
   - `movementBounceSpeed: 0.3` (bounce velocity)

3. **Renderer modifications**:
   - Replace the current hard-coded sine oscillation with a movement mode switch
   - Each mode computes `cx` and `cy` differently based on the selected mode and its params
   - For bounce mode, maintain internal state (position + velocity direction) that persists across frames. Use a simple object attached to the renderer instance.
   - `movementAmplitude` replaces the hard-coded `0.3` multiplier, making it controllable for all oscillation-based modes

4. **UI updates**:
   - Add a **Movement** group (new group between Shape and Color)
   - Movement mode selector buttons at top of Movement group
   - Sliders for all movement params
   - Re-label existing `shapeFreqX`/`shapeFreqY` to clarify they control movement speed (they're already in params, just need clearer labels like "Speed X" / "Speed Y" and move them to the Movement group)

5. **Update presets** to include movement parameters, with presets using different movement modes.

</requirements>

<implementation>
Movement calculations (all in JavaScript, in renderer.js _tick method):

**Lissajous** (mode 1):
```js
cx = 0.5 + amp * Math.sin(elapsed * freqX * TAU);
cy = 0.5 + amp * Math.sin(elapsed * freqY * TAU + phase);
```
When freqX and freqY have different values, this creates beautiful curves. Classic ratios: 1:2, 2:3, 3:4.

**Spiral** (mode 2):
```js
const angle = elapsed * spiralSpeed;
const r = (elapsed * spiralExpand) % amp; // wraps when reaching max amplitude
cx = 0.5 + r * Math.cos(angle);
cy = 0.5 + r * Math.sin(angle);
```

**Directional scroll** (mode 3):
```js
const dx = Math.cos(scrollAngle) * scrollSpeed * elapsed;
const dy = Math.sin(scrollAngle) * scrollSpeed * elapsed;
cx = ((dx % 1.0) + 1.0) % 1.0; // wrap to [0,1]
cy = ((dy % 1.0) + 1.0) % 1.0;
```

**Bounce** (mode 4):
Store position and velocity on the renderer. Each frame, advance position by velocity * deltaTime. When position hits 0 or 1, reverse that velocity component.

For the UI, the Movement group should be ordered: Mode selector → Amplitude → Speed X → Speed Y → mode-specific params. Moving shapeFreqX/shapeFreqY from the Shape group to Movement group means updating the CONTROL_DEFS group assignments and the GROUPS array.
</implementation>

<output>
Modify these files:
- `./src/renderer.js` - Replace sine oscillation with movement mode system
- `./src/params.js` - Add movement parameters, update presets
- `./src/ui.js` - Add Movement group with mode selector and sliders, reorganize freq params
- `./index.html` - Any needed CSS additions
</output>

<verification>
Before declaring complete, verify:
1. Read all modified files for consistency
2. Mode 0 (sine oscillation) produces the same motion as before (backwards compatible)
3. All 6 movement modes have implementations in the renderer
4. Bounce mode maintains internal state correctly (doesn't reset each frame)
5. Directional scroll wraps smoothly at edges (no visible jump)
6. All new params exist in DEFAULTS, presets, CONTROL_DEFS, and RANDOM_RANGES
7. Movement group appears in the UI between Shape and Color
8. shapeFreqX/shapeFreqY have been moved to the Movement group with updated labels
</verification>

<success_criteria>
- All 6 movement modes produce visually distinct motion patterns
- Lissajous creates recognizable figure-8 and loop patterns with different freq ratios
- Spiral creates outward-spiraling motion that wraps back
- Scroll creates smooth continuous motion in a controllable direction
- Bounce creates natural edge-bouncing behavior
- Fixed center keeps shape stationary at screen center
- Amplitude parameter works across all oscillation-based modes
- Movement mode is selectable via UI buttons
</success_criteria>
