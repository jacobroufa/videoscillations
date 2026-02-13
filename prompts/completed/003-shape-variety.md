<objective>
Expand the shape generation system from a single circle to a multi-shape system with selectable shape types. The Hypno hardware supports various geometric primitives, and our synthesizer needs the same variety. Each shape should be generated via SDF in the fragment shader, with a uniform-based shape selector.

This is the first of several feature expansions. The architecture must be extensible so future shapes can be added easily.
</objective>

<context>
This is an existing WebGL 2 video synthesizer project. Read all existing source files to understand the current architecture before making changes:

@./src/shaders/shape.frag - Currently only generates a circle SDF. This needs to become a multi-shape shader.
@./src/renderer.js - Render loop that passes shape uniforms. Needs new uniforms for shape type and additional shape parameters.
@./src/params.js - Central parameter store. Needs new parameters for shape type and shape-specific settings.
@./src/ui.js - Overlay UI with sliders. Needs a shape type selector and new parameter controls.
@./src/main.js - Entry point that gathers uniform locations. Needs to add new uniform names.

Tech stack: Pure WebGL 2, vanilla JS (ES modules), GLSL fragment shaders, no build tools.

The render pipeline is: feedback pass → shape pass (additive blend) → display pass. The shape pass renders to the same FBO as feedback using hardware additive blending (gl.blendFunc(ONE, ONE)).
</context>

<requirements>
1. **Shape types to implement** (all via SDF in the fragment shader):
   - **Circle** (existing) - filled circle with soft edges
   - **Ring** - hollow circle (donut shape). New param: `shapeRingWidth` (thickness of the ring)
   - **Line** - horizontal or vertical line that can rotate. New params: `shapeLineAngle` (rotation in radians), `shapeLineThickness`
   - **Cross** - two perpendicular lines (a plus sign). Uses line thickness param.
   - **Diamond** - rotated square (L1 norm / manhattan distance). Reuses radius for size.
   - **Star** - 4-pointed or 6-pointed star shape
   - **Triangle** - equilateral triangle

2. **Shape selector param**: Add `shapeType` as an integer param (0=circle, 1=ring, 2=line, 3=cross, 4=diamond, 5=star, 6=triangle). The shader uses this to branch between SDF functions.

3. **New parameters in params.js**:
   - `shapeType: 0` (integer, shape index)
   - `shapeRingWidth: 0.02` (ring thickness)
   - `shapeLineAngle: 0.0` (line rotation in radians)
   - `shapeLineThickness: 0.01` (line and cross thickness)

4. **Shader modifications** (`shape.frag`):
   - Add SDF functions for each shape type
   - Use a uniform integer `uShapeType` to select which SDF to evaluate
   - All shapes should respect the existing `uShapeCenter`, `uShapeRadius`, and `uShapeSoftness` uniforms
   - Maintain aspect ratio correction for all shapes

5. **UI updates** (`ui.js`):
   - Add a **shape type selector** as a row of buttons (not a slider) at the top of the Shape group, labeled with shape names
   - Add sliders for new params (ring width, line angle, line thickness) in the Shape group
   - Conditionally show/hide shape-specific sliders based on selected shape type (e.g., ring width only visible when ring is selected, line angle only for line/cross). This is a nice-to-have; showing all sliders at all times is acceptable if conditional visibility adds too much complexity.

6. **Renderer updates** (`renderer.js`):
   - Pass new uniforms (`uShapeType`, `uShapeRingWidth`, `uShapeLineAngle`, `uShapeLineThickness`) to the shape program

7. **Main.js updates**:
   - Add new uniform names to the shape program's uniform gathering

8. **Update presets** in params.js to include the new parameters, and make some presets use non-circle shapes to showcase the new variety.

</requirements>

<implementation>
SDF reference implementations:

- **Ring**: `float d = abs(length(p) - radius) - ringWidth;`
- **Line**: Rotate UV by angle, then `float d = abs(rotatedP.y) - thickness;` (infinite line, clamp to radius for segment)
- **Cross**: `float d = min(abs(p.x), abs(p.y)) - thickness;` clamped by radius
- **Diamond**: `float d = (abs(p.x) + abs(p.y)) - radius;` (L1 distance)
- **Star**: Use polar coordinates, modulo angle to create pointed shape
- **Triangle**: `p.y += radius * 0.3;` offset, then use triangle SDF formula

For the shape selector UI, use a simple approach: a container of buttons within the Shape group, where clicking a button updates `params.shapeType` and highlights the active button. Keep it simple - styled like the preset buttons but smaller.

Keep all SDF evaluations in a single shader with branching. The GPU branch overhead is negligible here since the entire screen evaluates the same branch (uniform-based branching is effectively free).
</implementation>

<output>
Modify these files:
- `./src/shaders/shape.frag` - Add all SDF functions and shape type branching
- `./src/params.js` - Add new shape parameters and update presets
- `./src/renderer.js` - Pass new shape uniforms
- `./src/main.js` - Gather new uniform locations
- `./src/ui.js` - Add shape type selector and new sliders
- `./index.html` - Add any needed CSS for shape selector buttons
</output>

<verification>
Before declaring complete, verify:
1. Read all modified files to confirm changes are consistent across the pipeline
2. Each shape type has a corresponding SDF function in the shader
3. The shape type uniform is properly passed from JS → shader
4. All new params exist in DEFAULTS, are included in presets, and have UI controls
5. The CONTROL_DEFS in ui.js include all new parameters with appropriate ranges
6. RANDOM_RANGES in ui.js include entries for all new parameters
</verification>

<success_criteria>
- All 7 shape types are selectable and render correctly
- Shape selector is accessible in the UI
- New shape-specific params (ring width, line angle, line thickness) affect their respective shapes
- Existing circle behavior is unchanged when shapeType=0
- Presets are updated to showcase shape variety
- No shader compilation errors
</success_criteria>
