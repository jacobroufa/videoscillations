<objective>
Expand the color system from basic hue rotation + brightness + saturation to a richer palette system with multiple colorization modes. The Hypno hardware offers various color mapping approaches, and our synthesizer needs similar creative control over color.

Currently, color is limited to hue rotation in the feedback shader and brightness/saturation in the display shader. This expansion adds color palettes, gradient mapping, and an initial color for the shape (rather than always white).
</objective>

<context>
Read all existing source files before making changes to understand the current state (which includes the shape variety additions from the previous prompt):

@./src/shaders/feedback.frag - Has hueRotate() function, applies hue shift to feedback
@./src/shaders/composite.frag - Display shader with brightness/saturation adjustments
@./src/shaders/shape.frag - Shape generator, currently outputs white (vec3(shape))
@./src/params.js - Central parameter store with existing color params (hueRotationSpeed, baseBrightness, saturation)
@./src/renderer.js - Render loop passing uniforms
@./src/main.js - Uniform gathering
@./src/ui.js - Overlay UI

The shape is rendered white-on-black and blended additively. By adding a color/hue to the shape output, we can control the initial color of new shapes entering the feedback loop.
</context>

<requirements>
1. **Shape base color**: Instead of always outputting white, the shape shader should output a colored shape.
   - New param: `shapeHue` (0.0 to 1.0, representing hue in HSV space)
   - The shape shader converts this hue to an RGB color and multiplies by the SDF intensity
   - When hue is 0 and saturation is 0, behavior should match current white output for backwards compatibility

2. **Color palette modes** for the display/composite shader:
   - `colorMode: 0` (integer param) selects the active mode:
     - **0 - Direct** (current behavior): hue rotation in feedback, brightness/saturation in display
     - **1 - Gradient map**: Map luminance of the composited frame to a color gradient. The gradient is defined by 3 color stops (dark, mid, bright) as hue values.
     - **2 - Posterize**: Reduce color to N discrete levels (quantize), creating a retro/graphic look. New param: `colorPosterizeLevels` (2-16)
     - **3 - Negative**: Invert colors (1.0 - color) before applying brightness/saturation
     - **4 - Thermal**: Map luminance to a thermal/heat camera palette (black → blue → red → yellow → white)

3. **New parameters in params.js**:
   - `shapeHue: 0.0` (0-1, hue for new shapes)
   - `shapeColorSat: 0.0` (0-1, saturation for shape color; 0 = white like before)
   - `colorMode: 0` (integer, color mode index)
   - `colorPosterizeLevels: 6` (for posterize mode)
   - `colorGradientHue1: 0.66` (blue - dark end of gradient)
   - `colorGradientHue2: 0.0` (red - mid of gradient)
   - `colorGradientHue3: 0.15` (yellow - bright end of gradient)

4. **Shader modifications**:
   - `shape.frag`: Add `uShapeHue` and `uShapeColorSat` uniforms. Convert hue+saturation to RGB using HSV→RGB conversion. Output `hsv2rgb(hue, sat, shape_intensity)` instead of `vec3(shape)`.
   - `composite.frag`: Add color mode branching. Mode 0 is existing behavior. Other modes apply their effect after sampling the frame texture but before brightness/saturation adjustments.

5. **UI updates**:
   - Add a **Color Mode** selector (buttons, like shape type) at the top of the Color group
   - Add sliders for: shape hue, shape color saturation, posterize levels, gradient hue 1/2/3
   - Shape hue slider should ideally show a hue spectrum as its track background (CSS gradient) - nice to have

6. **Update presets** to include new color parameters, with some presets using non-default color modes.

</requirements>

<implementation>
HSV to RGB conversion in GLSL:
```glsl
vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return v * mix(vec3(1.0), c, s);
}
```

Gradient mapping: Convert pixel to luminance, use smoothstep between 3 stops to interpolate between 3 hue-based colors.

Thermal palette: A classic lookup using luminance:
```glsl
vec3 thermal(float t) {
    // black → blue → red → yellow → white
    vec3 c = vec3(0.0);
    c = mix(c, vec3(0.0, 0.0, 1.0), smoothstep(0.0, 0.25, t));
    c = mix(c, vec3(1.0, 0.0, 0.0), smoothstep(0.25, 0.5, t));
    c = mix(c, vec3(1.0, 1.0, 0.0), smoothstep(0.5, 0.75, t));
    c = mix(c, vec3(1.0, 1.0, 1.0), smoothstep(0.75, 1.0, t));
    return c;
}
```

Posterize: `color = floor(color * levels + 0.5) / levels;`

For the color mode selector buttons in the UI, follow the same pattern as the shape type selector from the previous expansion.
</implementation>

<output>
Modify these files:
- `./src/shaders/shape.frag` - Add shape color (hue + saturation → RGB)
- `./src/shaders/composite.frag` - Add color mode branching (gradient, posterize, negative, thermal)
- `./src/params.js` - Add new color parameters and update presets
- `./src/renderer.js` - Pass new color uniforms to shape and display programs
- `./src/main.js` - Gather new uniform locations
- `./src/ui.js` - Add color mode selector and new sliders
- `./index.html` - Any needed CSS additions
</output>

<verification>
Before declaring complete, verify:
1. Read all modified files for consistency
2. Shape color: setting shapeHue=0.5, shapeColorSat=1.0 should produce cyan-colored shapes
3. All 5 color modes have shader implementations
4. Color mode 0 (Direct) produces identical output to the previous behavior
5. All new params exist in DEFAULTS, presets, CONTROL_DEFS, and RANDOM_RANGES
6. No shader compilation errors (check GLSL syntax carefully)
</verification>

<success_criteria>
- Shapes can be colored with any hue (not just white)
- All 5 color modes produce visually distinct results
- Color mode is selectable via UI buttons
- Posterize levels slider visibly changes the quantization
- Gradient mapping creates smooth color transitions based on luminance
- Existing default behavior (white shapes, direct color mode) is preserved
</success_criteria>
