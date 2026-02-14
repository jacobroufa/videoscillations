<objective>
Rewrite the Hypnewcade video synthesizer's shape generation to use fullscreen waveform oscillators
inspired by the Sleepy Circuits Hypno hardware, fix broken hue shift, and add proper
mirror/fractalization controls.

This is a WebGL2 video synthesizer with a feedback-loop architecture. The current implementation
uses SDF (signed distance field) geometric primitives positioned at a center point. The real Hypno
evaluates mathematical waveform functions across the entire screen, producing repeating color bars
whose frequency determines how many repetitions appear. This rewrite brings the shape generation
closer to the Hypno's approach while keeping the existing feedback pipeline intact.
</objective>

<context>
Read CLAUDE.md first for project conventions.

Key files to examine and modify:
- `./src/shaders/shape.frag` -- the shape generator shader (MAJOR REWRITE)
- `./src/shaders/feedback.frag` -- feedback shader (mirror fix, hue shift fix)
- `./src/shaders/composite.frag` -- display shader (mirror option for final output)
- `./src/renderer.js` -- render loop, uniform passing (update for new params/uniforms)
- `./src/params.js` -- parameter definitions, defaults, presets (update for new shape model)
- `./src/ui.js` -- UI controls (update for new params)
- `./src/main.js` -- uniform location gathering (update for new uniforms)

Supporting files (read for understanding, likely no changes needed):
- `./src/gl.js` -- WebGL utilities
- `./src/framebuffers.js` -- ping-pong FBO management
- `./src/shaders/fullscreen.vert` -- vertex shader (no changes needed)
- `./index.html` -- page structure
</context>

<research>
Before writing any code, thoroughly read ALL the files listed above to understand:
1. The current rendering pipeline (3-pass: feedback → shape → display, with ping-pong FBOs)
2. How uniforms are gathered and passed in main.js and renderer.js
3. The current parameter structure in params.js and how presets work
4. The UI control system in ui.js (slider creation, button selectors, sync mechanism)
5. The existing mirror/kaleidoscope implementation in feedback.frag

Understanding the full pipeline is critical because changes to shape.frag parameters cascade through
renderer.js (uniform passing), main.js (uniform location gathering), params.js (defaults/presets),
and ui.js (controls).
</research>

<requirements>

<requirement id="1" priority="critical">
<title>Rewrite shape.frag to fullscreen waveform oscillators</title>
<description>
Replace the SDF-based shape generator with fullscreen waveform functions evaluated at every pixel.

The Hypno generates shapes by evaluating a mathematical function across the entire screen coordinate
space. The key concept is "color bars" -- periodic functions that produce repeating bands of light.

Implement these waveform types:
- **Sine**: `sin(freq * coord)` -- smooth repeating color bands. At low frequency, a single broad
  gradient. At high frequency, many thin stripes.
- **Tan/Sawtooth**: `fract(freq * coord)` or shaped tangent -- sharper, more abrupt bands with
  hard edges between repetitions.
- **Square**: `step(0.5, fract(freq * coord))` -- alternating on/off bands (digital look).
- **Circle**: Radial distance from center -- concentric rings whose spacing is controlled by frequency.
- **Diamond**: L1/Manhattan distance from center with frequency repetition.
- **Triangle** (polygon): Keep the equilateral triangle SDF but make it repeat/tile.

Key parameters for the waveform oscillator:
- `shapeWaveform` (int): Selects which waveform function (0=Sine, 1=Tan, 2=Square, 3=Circle, 4=Diamond, 5=Triangle)
- `shapeFrequency` (float): How many repetitions across the screen (1.0 = one cycle, 10.0 = ten cycles). This is THE primary shape control.
- `shapeAngle` (float): Rotation angle of the waveform pattern in radians. For linear waveforms (sine/tan/square), this rotates the direction of the bars. For radial types, this rotates the coordinate space.
- `shapeThickness` (float): Controls the duty cycle / line thickness of the waveform bands (0.0-1.0). At 0.5, bars and gaps are equal width. At 0.1, thin bright lines with wide dark gaps. At 0.9, wide bright bars with thin dark gaps.
- `shapeSoftness` (float): Edge softness / anti-aliasing width of the bands.
- `shapePhaseOffset` (float): Phase offset of the waveform (0 to 2*PI), for animating the pattern position over time or via the movement system.

How the waveform evaluation works:
1. Start with UV coordinates (0,0)-(1,1) from the vertex shader
2. Apply rotation by `shapeAngle` around screen center
3. Project onto the appropriate axis (for linear waveforms, use the rotated X axis; for radial, use distance from center)
4. Evaluate `waveformFunction(shapeFrequency * projectedCoord + shapePhaseOffset)`
5. Apply thickness (duty cycle): compare waveform output against threshold
6. Apply softness via smoothstep
7. Output colored result (using shapeHue, shapeColorSat)

CRITICAL: The waveforms must be FULLSCREEN. There is no "center position" or "radius" that clips
the shape. Linear waveforms (sine, tan, square) produce bars that span from edge to edge. The
frequency determines how many bars fit on screen. When the pattern scrolls or rotates, bars that
leave one edge must seamlessly enter from the opposite edge (periodic/wrapping behavior).

For radial types (circle, diamond), the pattern radiates from the center of the screen and the
frequency controls the spacing between concentric rings/shapes.
</description>
</requirement>

<requirement id="2" priority="critical">
<title>Fix hue shift (currently broken)</title>
<description>
The hue rotation in feedback.frag uses Rodrigues' rotation around the (1,1,1) axis. This works
mathematically BUT has a critical flaw: when the shape color is white (shapeColorSat=0), the RGB
value is (1,1,1) which lies EXACTLY on the rotation axis. Rotating a vector around itself produces
no change. Hue shift has zero effect on white pixels.

Fix approach:
1. The shape generator MUST output colored pixels for hue shift to work. Change the default
   `shapeColorSat` from 0.0 to 1.0 so shapes have color by default.
2. When `shapeColorSat` is 0, the shape outputs pure white -- hue shift still won't affect these
   pixels, which is mathematically correct. The user needs to understand that hue cycling requires
   colored input. Consider adding a "base hue cycling" mode that automatically varies shapeHue
   over time, independent of the feedback hue shift. This would be like the Hypno's "root hue"
   control.
3. Verify the hue rotation math is correct by testing with saturated color input. The `hueRotate`
   function should progressively shift colors through the spectrum as feedback accumulates.
4. Consider increasing the default `hueRotationSpeed` -- at 0.001 radians/frame, it takes ~6283
   frames (~105 seconds at 60fps) for a full rotation. A default of 0.01-0.02 would be more
   visually apparent.
</description>
</requirement>

<requirement id="3" priority="critical">
<title>Fix mirroring -- shape should not overlay as separate "original"</title>
<description>
Currently, mirror/kaleidoscope is applied ONLY in the feedback shader's UV sampling. The shape
pass then draws the un-mirrored shape on top via additive blending. This means you always see
the "original" shape sitting on top of mirrored feedback trails, which looks wrong.

Implement a `mirrorTarget` parameter (int) that controls where mirroring is applied:
- 0 = Feedback only (current behavior)
- 1 = Shape only (mirror the shape pass output, feedback is not mirrored)
- 2 = Both (mirror in both feedback AND shape passes)
- 3 = Output (mirror in the display/composite pass, affecting the final output)

Implementation approach:
- **Shape pass mirroring**: Apply the same `applyMirror()` UV transform function to the shape
  shader's UV coordinates BEFORE evaluating the waveform. This means the shape itself appears
  mirrored -- you see the reflected pattern, not the original. Copy the `applyMirror()` and
  `kaleidoscope()` functions from feedback.frag into shape.frag and apply them to vUV before
  the waveform evaluation.
- **Display pass mirroring**: Add the same mirror functions to composite.frag and apply to vUV
  before sampling the frame texture.
- Pass `uMirrorMode`, `uKaleidoscopeAngle`, and `uMirrorTarget` as uniforms to all three shaders.
- In renderer.js, conditionally apply mirroring based on `mirrorTarget`.

When mirrorTarget=2 (both), the shape is drawn mirrored AND the feedback samples are mirrored.
This means no "original" shape is visible -- the entire visual is the mirrored/kaleidoscope pattern.
</description>
</requirement>

<requirement id="4" priority="high">
<title>Add fractalization to shape pass</title>
<description>
The Hypno's "fractal" control creates kaleidoscope-like tiling by recursively mirroring the
oscillator output along a configurable axis. This is applied to the shape output BEFORE it
enters the feedback loop.

Implement fractalization as a UV-space transform in the shape shader:
- `shapeFractalAmount` (int, 0-6): Number of recursive mirror folds. 0 = off, 1 = single mirror,
  2 = 2-fold, 4 = 4-fold, 8 = 8-fold symmetry (values 3-6 map to increasing fold counts).
- `shapeFractalAngle` (float): Rotation angle of the fractal mirror axis.

The fractalization works by:
1. Center the UV coordinates around (0.5, 0.5)
2. Convert to polar coordinates (angle, radius)
3. Apply angle offset from `shapeFractalAngle`
4. Fold the angle into a wedge: `angle = mod(angle, wedgeSize)`, then mirror within the wedge
5. Convert back to Cartesian
6. Evaluate the waveform at these transformed coordinates

This is similar to the kaleidoscope function already in feedback.frag but applied to the shape's
own coordinate space, creating symmetry in the generated pattern itself (not in the feedback trail).
</description>
</requirement>

<requirement id="5" priority="high">
<title>Integrate movement system with waveform oscillator</title>
<description>
The current movement system computes a (cx, cy) center position for the shape. With fullscreen
waveforms, "movement" translates to phase animation -- the waveform pattern scrolling across the screen.

Map the movement modes to waveform phase/offset animation:
- **Sine/Lissajous modes**: Oscillate the `shapePhaseOffset` sinusoidally, creating a back-and-forth
  scanning motion of the bars.
- **Scroll mode**: Continuously increment `shapePhaseOffset` at constant speed, creating smoothly
  scrolling bars that wrap seamlessly.
- **Spiral mode**: For radial waveforms, animate both the phase and the angle, creating a spinning
  spiral pattern.
- **Bounce mode**: Oscillate phase with bounce-at-edges behavior.
- **Fixed mode**: No phase animation (static pattern).

The `movementAmplitude` parameter controls how far the phase shifts. The `shapeFreqX`/`shapeFreqY`
parameters from the old system map to animation speed.

IMPORTANT: When a linear waveform (sine/tan/square) scrolls, the bars must wrap seamlessly. Since
the waveform is periodic, adding to the phase offset naturally creates seamless scrolling -- bars
exiting one edge appear at the opposite edge because the function is evaluated at every pixel
independently.
</description>
</requirement>

<requirement id="6" priority="medium">
<title>Update params.js with new parameter model</title>
<description>
Replace the old shape parameters with the new waveform oscillator model. Remove parameters that
no longer apply (shapeType, shapeRadius, shapeRingWidth, etc.) and add the new ones.

New/changed parameters in DEFAULTS:
```
// Shape oscillator (replacing old SDF params)
shapeWaveform:        0,       // 0=Sine, 1=Tan, 2=Square, 3=Circle, 4=Diamond, 5=Triangle
shapeFrequency:       4.0,     // repetitions across screen
shapeAngle:           0.0,     // rotation of waveform pattern (radians)
shapeThickness:       0.5,     // duty cycle (0.0-1.0)
shapeSoftness:        0.02,    // edge softness
shapePhaseOffset:     0.0,     // waveform phase offset

// Fractalization
shapeFractalAmount:   0,       // 0=off, 1-6 = increasing fold counts
shapeFractalAngle:    0.0,     // fractal mirror axis angle

// Mirror target
mirrorTarget:         2,       // 0=feedback, 1=shape, 2=both, 3=output

// Shape color (fix defaults for working hue shift)
shapeHue:             0.0,
shapeColorSat:        1.0,     // CHANGED from 0.0 -- shapes are colored by default now
```

Update ALL presets in the `presets` object to use the new parameter names and sensible values
that showcase the waveform oscillator capabilities. The presets should demonstrate different
waveform types, frequencies, and movement patterns.

Update RANDOM_RANGES to cover the new parameter ranges.
</description>
</requirement>

<requirement id="7" priority="medium">
<title>Update renderer.js for new uniforms</title>
<description>
Update the render loop to pass the new uniforms to the shaders:

Shape pass:
- Remove old uniforms: uShapeCenter, uShapeRadius, uShapeType, uShapeRingWidth, uShapeLineAngle, uShapeLineThickness
- Add new uniforms: uShapeWaveform, uShapeFrequency, uShapeAngle, uShapeThickness, uShapePhaseOffset, uShapeFractalAmount, uShapeFractalAngle
- Add mirror uniforms to shape pass: uMirrorMode, uKaleidoscopeAngle, uMirrorTarget
- Compute phase offset from movement system (replace the old cx,cy center computation with phase animation)

Feedback pass:
- Add uMirrorTarget uniform so the feedback shader can conditionally apply mirroring

Display pass:
- Add mirror uniforms: uMirrorMode, uKaleidoscopeAngle, uMirrorTarget

Update main.js uniform location gathering to match.
</description>
</requirement>

<requirement id="8" priority="medium">
<title>Update ui.js controls</title>
<description>
Update the UI to reflect the new parameter model:

- Replace Shape Type button selector with Waveform selector (Sine, Tan, Square, Circle, Diamond, Triangle)
- Add Mirror Target button selector (Feedback, Shape, Both, Output)
- Replace old shape sliders (Radius, Mod Amount, Mod Frequency, Ring Width, Line Angle, Line Thickness)
  with new ones (Frequency, Angle, Thickness, Phase Offset, Fractal Amount, Fractal Angle)
- Keep Softness slider
- Keep Shape Hue and Shape Color Sat sliders but change default display

Group the new controls logically. The Fractal controls can go in the Shape group or a new
"Symmetry" group alongside the mirror controls.
</description>
</requirement>

</requirements>

<implementation>

<approach>
Work through the changes in this order to minimize breakage:

1. **Read all files first** -- understand every line of the current pipeline before changing anything
2. **Update params.js** -- define the new parameter model (this is the "contract" everything else follows)
3. **Rewrite shape.frag** -- the core visual change. Replace SDF evaluation with waveform functions.
   Include mirror/fractalization transforms. Include the hsv2rgb and applyMirror/kaleidoscope
   utility functions.
4. **Update feedback.frag** -- add mirrorTarget conditional to mirroring. Fix any issues with
   hue shift defaults.
5. **Update composite.frag** -- add optional mirror pass for mirrorTarget=3 (output mode)
6. **Update main.js** -- update uniform location names for all three programs
7. **Update renderer.js** -- update uniform passing, rewrite movement→phase mapping
8. **Update ui.js** -- update control definitions, selectors, sync functions
9. **Test mentally** -- trace through the full pipeline to verify data flow is correct

For maximum efficiency, whenever you need to perform multiple independent file reads, invoke all
relevant tools simultaneously rather than sequentially.
</approach>

<constraints>
- All shaders MUST be `#version 300 es` with `precision highp float;`
- The 3-pass pipeline structure (feedback → shape → display with ping-pong FBOs) must NOT change.
  The shape pass must still use additive blending onto the feedback result.
- Do NOT change gl.js, framebuffers.js, fullscreen.vert, or index.html
- Keep the preset system working -- all presets must use the new parameter names
- Keep keyboard shortcuts working (Space=randomize, R=reset, Tab=toggle UI, F=fullscreen)
- The overlay UI auto-hide behavior must not change
- Waveform functions must be evaluated in normalized UV space (0-1) with proper aspect ratio correction
- All waveform patterns must tile/wrap seamlessly -- no visible seams or discontinuities when scrolling
- Mirror/kaleidoscope utility functions should be shared via copy (each shader file must be self-contained since GLSL has no #include mechanism)
</constraints>

<things_to_avoid>
- Do NOT keep the old SDF shape code. This is a full replacement, not an addition. Remove all
  references to the old shape types (sdCircle, sdRing, sdLine, sdCross, sdStar, sdTriangle).
- Do NOT add a "center position" to waveforms. Linear waveforms span the full screen by definition.
  Movement is expressed through phase offset, not position.
- Do NOT break the feedback loop. The ping-pong buffer swap must continue to work correctly.
- Do NOT add WebGL extensions or change the GL context setup.
- Do NOT duplicate the applyMirror logic with subtle differences between shaders -- copy the
  exact same functions to maintain consistency.
</things_to_avoid>
</implementation>

<output>
Modify these existing files (do NOT create new files):
- `./src/shaders/shape.frag` -- full rewrite
- `./src/shaders/feedback.frag` -- add mirrorTarget conditional
- `./src/shaders/composite.frag` -- add optional mirror for output mode
- `./src/renderer.js` -- update uniforms, rewrite movement system
- `./src/params.js` -- new parameter model, update all presets
- `./src/ui.js` -- new controls for waveform oscillator
- `./src/main.js` -- update uniform location names
</output>

<verification>
After completing all changes, verify the following by tracing through the code:

1. **Uniform consistency**: Every uniform declared in a shader has a matching location gathered in
   main.js and a value set in renderer.js. No uniform is missing or misspelled.
2. **Parameter consistency**: Every parameter in params.js DEFAULTS has a matching entry in
   CONTROL_DEFS (ui.js) or a button selector, and a matching entry in RANDOM_RANGES. Every preset
   uses only parameter names that exist in DEFAULTS.
3. **Shader compilation**: All shaders use valid GLSL ES 3.0 syntax. No undeclared variables,
   no type mismatches, no missing semicolons.
4. **Data flow**: Trace one frame through the full pipeline:
   - feedback.frag reads previous frame, applies transforms + conditional mirror + hue shift + decay
   - shape.frag evaluates waveform + conditional mirror/fractalization, outputs colored shape
   - Additive blend composites shape onto feedback result
   - composite.frag reads composite, applies color mode + conditional mirror + brightness/saturation
5. **Mirror modes work correctly**: When mirrorTarget=2 (both), the shape itself appears mirrored
   AND the feedback trails are mirrored. No "original" un-mirrored shape should be visible.
6. **Hue shift works**: With shapeColorSat=1.0 (colored shape), feedback hue rotation should
   progressively shift trail colors through the spectrum.
7. **Waveforms wrap**: Linear waveforms evaluated at UV coordinates tile seamlessly. Phase offset
   animation creates smooth scrolling with no visible discontinuities.
</verification>

<success_criteria>
- Shape.frag generates fullscreen waveform patterns (sine bars, tan bars, square bars, concentric circles, diamonds, triangles) spanning edge-to-edge
- Frequency control produces visible repetition (more bars at higher frequency)
- Waveform patterns scroll/animate seamlessly via phase offset with no discontinuities
- Hue shift produces visible rainbow color cycling on feedback trails
- Mirror modes apply to shape, feedback, both, or output based on mirrorTarget setting
- When mirrorTarget includes shape, no un-mirrored "original" shape is visible
- Fractalization creates n-fold symmetry in the shape pattern
- All presets load without errors and produce visually interesting results
- UI controls correctly map to all new parameters
- Randomize produces varied, interesting results with the new parameter model
</success_criteria>
