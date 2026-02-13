<objective>
Add mirroring and kaleidoscope effects to the feedback pipeline. These are signature effects of the Hypno hardware - they transform the feedback buffer to create symmetrical, mandala-like visuals. Mirror modes reflect the image across axes, while kaleidoscope modes create rotational symmetry by repeating a wedge slice around the center.

These effects are applied to the UV coordinates when sampling the feedback buffer, so they go in the feedback shader as a UV transformation step.
</objective>

<context>
Read all existing source files before making changes (the codebase now includes shape variety, expanded color, and movement patterns from previous prompts):

@./src/shaders/feedback.frag - This is where mirror/kaleidoscope effects belong. Currently transforms UVs for rotation, zoom, and translation, then samples the previous frame. Mirror/kaleidoscope would be an additional UV transformation step.
@./src/params.js - Central parameter store
@./src/renderer.js - Passes feedback uniforms
@./src/main.js - Gathers feedback uniform locations
@./src/ui.js - Overlay UI

The feedback shader flow is: center UVs → rotate → zoom → translate → sample texture → hue rotate → decay. Mirror/kaleidoscope should be applied to the UVs AFTER the other transforms but BEFORE sampling, so the symmetry is applied to the already-transformed coordinates.
</context>

<requirements>
1. **Mirror/symmetry mode selector**: New integer param `mirrorMode` (0-6):
   - **0 - None** (current behavior): No mirroring
   - **1 - Horizontal**: Mirror left half to right (or right to left). `uv.x = abs(uv.x - 0.5) + 0.5` or similar
   - **2 - Vertical**: Mirror top half to bottom
   - **3 - Quad**: Mirror one quadrant to all four (both horizontal + vertical)
   - **4 - Kaleidoscope 2-fold**: 2 segments of rotational symmetry (180 degrees)
   - **5 - Kaleidoscope 4-fold**: 4 segments (90 degrees each)
   - **6 - Kaleidoscope 8-fold**: 8 segments (45 degrees each) - creates intricate mandala patterns

2. **Kaleidoscope parameters**:
   - `kaleidoscopeAngle: 0.0` (rotation offset for the kaleidoscope wedge, 0 to 6.283 radians). This rotates the axis of symmetry, creating spinning kaleidoscope effects when animated.

3. **Feedback blend mode**: While we're modifying the feedback shader, also add different blend modes for how the feedback is combined. New integer param `feedbackBlendMode` (0-3):
   - **0 - Multiply** (current behavior): `color * decay` - fades to black
   - **1 - Screen**: `1.0 - (1.0 - color) * decay` - fades to white instead of black, bright/dreamy look
   - **2 - Soft burn**: Uses a softer curve - `pow(color, vec3(1.0 / decay))` - different fade character
   - **3 - Freeze**: Decay = 1.0 forced, trails never fade. Useful for building up layered compositions. (Actually just set decay to 1.0 in the shader when this mode is active.)

4. **Shader modifications** (`feedback.frag`):
   - Add mirror/kaleidoscope UV transformations after existing transforms, before texture sampling
   - Add `uMirrorMode` uniform (int)
   - Add `uKaleidoscopeAngle` uniform (float)
   - Add `uFeedbackBlendMode` uniform (int)
   - Implement each mirror mode as a UV transformation
   - Implement each blend mode as different decay application

5. **New parameters in params.js**:
   - `mirrorMode: 0` (integer, 0-6)
   - `kaleidoscopeAngle: 0.0` (float, 0 to 6.283)
   - `feedbackBlendMode: 0` (integer, 0-3)

6. **UI updates**:
   - Add a **Mirror** selector (buttons) at the top of the Feedback group (or create a new "Symmetry" group)
   - Add kaleidoscope angle slider
   - Add a **Blend Mode** selector (buttons) in the Feedback group
   - Labels for mirror modes: "Off", "H Mirror", "V Mirror", "Quad", "Kal 2", "Kal 4", "Kal 8"
   - Labels for blend modes: "Multiply", "Screen", "Soft Burn", "Freeze"

7. **Update presets** with mirror and blend mode values. Ensure the "Kaleidoscope" preset actually uses kaleidoscope mode now.

</requirements>

<implementation>
Kaleidoscope in GLSL - the key technique is to convert to polar coordinates, modulo the angle to create repeating wedges, and convert back:

```glsl
vec2 kaleidoscope(vec2 uv, int segments, float angleOffset) {
    vec2 centered = uv - 0.5;
    float angle = atan(centered.y, centered.x) + angleOffset;
    float radius = length(centered);

    // The wedge angle for N segments
    float wedge = 3.14159265 * 2.0 / float(segments);

    // Fold the angle into a single wedge
    angle = mod(angle, wedge);

    // Mirror within the wedge for cleaner symmetry
    if (angle > wedge * 0.5) {
        angle = wedge - angle;
    }

    // Convert back to cartesian
    centered = vec2(cos(angle), sin(angle)) * radius;
    return centered + 0.5;
}
```

Mirror in GLSL:
```glsl
// Horizontal mirror
uv.x = 0.5 + abs(uv.x - 0.5);

// Vertical mirror
uv.y = 0.5 + abs(uv.y - 0.5);

// Quad mirror (both)
uv = 0.5 + abs(uv - 0.5);
```

For the feedback blend modes, apply after hue rotation:
```glsl
// Mode 0: Multiply (current)
fragColor = vec4(color * uDecay, 1.0);

// Mode 1: Screen
fragColor = vec4(1.0 - (1.0 - color) * uDecay, 1.0);

// Mode 2: Soft burn
fragColor = vec4(pow(color, vec3(1.0 / max(uDecay, 0.01))), 1.0);

// Mode 3: Freeze
fragColor = vec4(color, 1.0);
```

Important: The mirror/kaleidoscope transformation should be applied to the UV coordinates AFTER rotation/zoom/translate but BEFORE the texture sample. This way, the symmetry is applied to the transformed feedback, creating evolving symmetrical patterns.

Order in the shader main():
1. Center UVs
2. Apply rotation, zoom, translate (existing)
3. Apply mirror/kaleidoscope (new)
4. Sample texture
5. Apply hue rotation (existing)
6. Apply blend mode / decay (modified)
</implementation>

<output>
Modify these files:
- `./src/shaders/feedback.frag` - Add mirror/kaleidoscope UV transforms and blend modes
- `./src/params.js` - Add mirror, kaleidoscope, and blend mode parameters; update presets
- `./src/renderer.js` - Pass new feedback uniforms
- `./src/main.js` - Gather new uniform locations
- `./src/ui.js` - Add mirror mode selector, blend mode selector, and kaleidoscope angle slider
- `./index.html` - Any needed CSS additions
</output>

<verification>
Before declaring complete, verify:
1. Read all modified files for consistency
2. Mirror mode 0 produces identical output to previous behavior
3. All 7 mirror modes have shader implementations
4. Kaleidoscope creates visible rotational symmetry
5. All 4 blend modes produce visually distinct results
6. Blend mode 0 (Multiply) matches previous behavior exactly
7. All new params exist in DEFAULTS, presets, CONTROL_DEFS, and RANDOM_RANGES
8. The "Kaleidoscope" preset now uses an actual kaleidoscope mirror mode
9. No shader compilation errors
</verification>

<success_criteria>
- Horizontal mirror creates perfect left-right symmetry in the feedback
- Vertical mirror creates perfect top-bottom symmetry
- Quad mirror creates 4-way symmetry
- Kaleidoscope modes create visually stunning rotational symmetry patterns
- Kaleidoscope angle slider smoothly rotates the axis of symmetry
- Screen blend mode creates a bright/dreamy alternative to the default dark trails
- Freeze mode accumulates patterns without fading
- All modes combine correctly with existing feedback rotation/zoom/translate
- The combination of kaleidoscope + rotation feedback creates evolving mandala patterns
</success_criteria>
