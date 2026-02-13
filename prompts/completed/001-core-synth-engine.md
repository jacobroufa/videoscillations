<objective>
Build the core rendering engine for a browser-based video synthesizer inspired by the Sleepy Circuits Hypno. This is the foundation layer: a WebGL/GLSL shader pipeline with a feedback loop, shape generation, movement transforms, and colorization. No UI yet - just the engine with tunable parameters exposed as JavaScript variables.

The end goal is a fullscreen visual experience where geometric shapes feed into a recursive feedback buffer that rotates, zooms, and shifts - creating the characteristic hypnotic, evolving visuals the Hypno is known for.
</objective>

<context>
This is a greenfield browser-based project ("hypnewcade"). There is no existing code - only a git repo with a .gitignore.

Tech stack:
- Pure WebGL 2 (no libraries like Three.js) for maximum shader control
- Vanilla JavaScript (ES modules) - no build tools or bundlers for now
- Single HTML file that loads JS modules
- GLSL fragment shaders for all visual processing

The Sleepy Circuits Hypno is a hardware video synthesizer. Its core magic is the **feedback loop**: each frame, the previous output is read back, transformed (rotated, zoomed, translated), and blended with newly generated shapes. This recursion creates evolving, psychedelic visuals. Key Hypno concepts to replicate:
- **Feedback buffer**: ping-pong between two framebuffers (FBO A and FBO B alternate as read/write each frame)
- **Shape oscillator**: geometric primitives (start with circle) whose parameters (size, position, softness) are modulated by time-based oscillators (sine, triangle waves)
- **Feedback transforms**: rotation, zoom (scale), and X/Y translation applied to the feedback buffer each frame
- **Colorization**: hue rotation applied to the feedback buffer, creating rainbow trails as shapes feed back
</context>

<requirements>
Build the following components:

1. **Project shell** (`./index.html`):
   - Fullscreen canvas, no margins/scrollbars, black background
   - Loads the main JS module
   - Canvas should resize to fill the viewport and handle window resize

2. **WebGL bootstrap** (`./src/gl.js`):
   - Initialize WebGL 2 context from the canvas
   - Utility functions: compile shader, link program, create fullscreen quad VAO
   - Error handling for WebGL support and shader compilation failures

3. **Framebuffer manager** (`./src/framebuffers.js`):
   - Create two framebuffers (ping-pong pair) at canvas resolution
   - Each has a color texture attachment (RGBA8, linear filtering, clamp-to-edge)
   - `swap()` method to alternate read/write roles
   - Handle resize (recreate textures when canvas size changes)

4. **Shader programs**:
   - **Feedback shader** (`./src/shaders/feedback.frag`): Reads the previous frame texture, applies rotation (around center), zoom (scale from center), and X/Y translation. Uses `mix()` to blend toward black based on a decay parameter (controls trail length). Output is the transformed, decayed previous frame.
   - **Shape shader** (`./src/shaders/shape.frag`): Generates a filled circle using SDF (signed distance field). Circle position, radius, and softness are uniforms driven by oscillators. Outputs the shape as white-on-black (or with a base hue).
   - **Composite shader** (`./src/shaders/composite.frag`): Takes the feedback texture and the shape texture, blends them using additive blending. Applies hue rotation to the combined result. Outputs final color.
   - **Passthrough vertex shader** (`./src/shaders/fullscreen.vert`): Simple fullscreen triangle/quad vertex shader used by all fragment shaders.

5. **Render loop** (`./src/renderer.js`):
   - `requestAnimationFrame` loop
   - Each frame:
     a. Render feedback shader: read from FBO A (previous frame) → write to FBO B, applying rotation/zoom/translate/decay
     b. Render shape shader: generate current shape into a temporary texture or render target
     c. Render composite shader: blend FBO B (feedback) + shape → write back to FBO B (or a final output)
     d. Display FBO B to screen (render to default framebuffer)
     e. Swap FBOs (so next frame reads from what we just wrote)
   - Pass elapsed time to shaders for oscillator calculations

6. **Parameter system** (`./src/params.js`):
   - Export a single `params` object with all tunable values:
     ```
     params = {
       // Feedback
       feedbackRotation: 0.01,    // radians per frame
       feedbackZoom: 1.005,       // scale factor (>1 zooms in, <1 zooms out)
       feedbackXShift: 0.0,       // horizontal translate
       feedbackYShift: 0.0,       // vertical translate
       feedbackDecay: 0.97,       // trail persistence (0-1, higher = longer trails)

       // Shape oscillator
       shapeFreqX: 0.5,          // X position oscillation speed
       shapeFreqY: 0.7,          // Y position oscillation speed
       shapeRadius: 0.08,        // base radius (0-1 normalized)
       shapeRadiusModAmt: 0.03,  // radius modulation amount
       shapeRadiusModFreq: 1.2,  // radius modulation speed
       shapeSoftness: 0.02,      // edge softness

       // Color
       hueRotationSpeed: 0.001,  // hue shift per frame applied to feedback
       baseBrightness: 1.0,      // overall brightness multiplier
       saturation: 1.0,          // color saturation
     }
     ```
   - These will be wired to UI controls in a later phase - for now they're just JS variables
   - Include a few interesting preset combinations as comments

7. **Main entry point** (`./src/main.js`):
   - Import all modules, initialize WebGL, create framebuffers, compile shaders
   - Start the render loop
   - Wire `params` to shader uniforms each frame

</requirements>

<implementation>
Key technical guidance:

- **Ping-pong technique**: Use two FBOs. Frame N reads from FBO[0], writes to FBO[1]. Frame N+1 reads from FBO[1], writes to FBO[0]. This avoids read-write conflicts on the same texture. This is THE critical technique that makes feedback work.

- **Feedback rotation in shader**: In the feedback fragment shader, transform the UV coordinates (not the geometry). To rotate the sampled position around the center:
  ```glsl
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 centered = uv - 0.5;
  float s = sin(rotation);
  float c = cos(rotation);
  centered = mat2(c, -s, s, c) * centered;
  centered *= zoom; // apply zoom
  centered += vec2(xShift, yShift); // apply translation
  vec2 sampleUV = centered + 0.5;
  ```

- **SDF circle**: `float d = length(uv - center) - radius; float shape = 1.0 - smoothstep(0.0, softness, d);`

- **Hue rotation**: Convert RGB to HSV (or use a rotation matrix in RGB space), shift H, convert back. The rotation matrix approach is more efficient in a shader:
  ```glsl
  vec3 hueShift(vec3 color, float shift) {
      vec3 k = vec3(0.57735);
      float cosAngle = cos(shift);
      return color * cosAngle + cross(k, color) * sin(shift) + k * dot(k, color) * (1.0 - cosAngle);
  }
  ```

- **Aspect ratio**: Account for non-square viewports in the shape shader so circles stay circular.

- **Texture filtering**: Use `GL_LINEAR` for feedback texture sampling to get smooth sub-pixel feedback transforms (this is what creates the characteristic smooth trails).

- Start with default parameter values that produce immediately interesting visuals - the user should see cool feedback patterns as soon as they open the page. The defaults in the params section above are tuned for this.
</implementation>

<output>
Create these files:
- `./index.html` - HTML shell with fullscreen canvas
- `./src/gl.js` - WebGL 2 initialization and utilities
- `./src/framebuffers.js` - Ping-pong framebuffer manager
- `./src/shaders/fullscreen.vert` - Fullscreen quad vertex shader
- `./src/shaders/feedback.frag` - Feedback transform + decay shader
- `./src/shaders/shape.frag` - Circle SDF shape generator
- `./src/shaders/composite.frag` - Blend feedback + shape, apply color
- `./src/renderer.js` - Render loop orchestration
- `./src/params.js` - Parameter definitions with defaults
- `./src/main.js` - Entry point, initialization, uniform wiring
</output>

<verification>
Before declaring complete, verify:
1. Open `./index.html` in a browser (or use a local dev server if ES modules require it)
2. You should see animated, colorful feedback visuals immediately - shapes creating trails that rotate and zoom
3. Changing values in `params.js` and refreshing should produce noticeably different visuals
4. No WebGL errors in the browser console
5. The canvas fills the entire viewport and handles window resize
6. Check that the feedback loop is actually working - you should see recursive trails, not just a single shape
</verification>

<success_criteria>
- Fullscreen WebGL 2 canvas renders at 60fps
- Feedback loop creates visible recursive trails (the hallmark Hypno look)
- Shape oscillates position and size over time
- Hue rotation creates rainbow color cycling in the feedback trails
- All parameters in params.js are wired to shader uniforms and affect the output
- Code is modular and clean, ready for UI controls to be wired in
- Page loads and shows interesting visuals with zero user interaction required
</success_criteria>
