<objective>
Add an interactive overlay UI to the Hypno-style video synthesizer. The UI should be minimal and visuals-first: fullscreen visuals by default, with a translucent control panel that appears on hover or keypress. All controls map directly to the parameters defined in `./src/params.js`.

This turns the engine from a static demo into an interactive instrument that can be performed with and explored.
</objective>

<context>
This builds on top of the core synth engine created in the previous phase. Read the existing codebase first to understand the architecture:

@./src/params.js - All tunable parameters (this is your source of truth for what controls to create)
@./src/main.js - Entry point and initialization
@./src/renderer.js - Render loop
@./index.html - Current HTML shell

The synthesizer uses WebGL 2 with GLSL shaders, vanilla JS (ES modules), and no build tools. The `params` object in `params.js` contains all the parameters that need UI controls.

Design philosophy: This is a visual instrument. The visuals are the star - the UI should get out of the way until needed, then provide immediate, tactile control.
</context>

<requirements>
1. **Overlay panel** (`./src/ui.js`):
   - A translucent dark panel (semi-transparent black/dark gray background, `backdrop-filter: blur` if performant)
   - Hidden by default - appears when user moves the mouse or presses `Tab`
   - Hides after 3 seconds of mouse inactivity (resets timer on mouse movement)
   - Positioned along the right side of the screen, scrollable if controls exceed viewport height
   - Does NOT interfere with the WebGL canvas rendering

2. **Control types**:
   - **Range sliders** for continuous parameters (rotation speed, zoom, decay, frequencies, etc.)
   - Each slider shows: parameter name (human-readable label), current value, and the slider
   - Sliders update `params` values in real-time (no apply button needed)
   - Sensible min/max/step values for each parameter:
     - Rotation: -0.1 to 0.1, step 0.001
     - Zoom: 0.95 to 1.05, step 0.001
     - Shift X/Y: -0.05 to 0.05, step 0.001
     - Decay: 0.8 to 1.0, step 0.005
     - Frequencies: 0.0 to 5.0, step 0.01
     - Radius: 0.01 to 0.3, step 0.005
     - Mod amount: 0.0 to 0.1, step 0.005
     - Softness: 0.0 to 0.1, step 0.005
     - Hue speed: 0.0 to 0.05, step 0.0005
     - Brightness: 0.0 to 2.0, step 0.05
     - Saturation: 0.0 to 2.0, step 0.05

3. **Parameter grouping**: Organize controls into labeled sections:
   - **Feedback**: rotation, zoom, X shift, Y shift, decay
   - **Shape**: frequency X, frequency Y, radius, radius mod amount, radius mod frequency, softness
   - **Color**: hue rotation speed, brightness, saturation

4. **Keyboard shortcuts**:
   - `Tab` - Toggle UI visibility
   - `Space` - Randomize all parameters within their valid ranges (instant visual change)
   - `R` - Reset all parameters to defaults
   - `F` - Toggle actual fullscreen (Fullscreen API)
   - Prevent default browser behavior for these keys

5. **Preset system** (basic):
   - Add 3-5 built-in presets with evocative names (e.g., "Slow Drift", "Tunnel Vision", "Chaos Spiral")
   - Each preset is a complete set of parameter values that produce interesting visuals
   - Preset selector at the top of the UI panel (dropdown or buttons)
   - Selecting a preset instantly applies all its parameter values and updates slider positions

6. **Styling** (`./src/ui.css` or inline styles):
   - All styles should be dark-themed to not distract from visuals
   - Sliders styled to be compact but usable
   - Use CSS custom properties for consistent theming
   - Text in a monospace or clean sans-serif font, small but readable
   - Smooth fade in/out transition for the panel (CSS transition on opacity)

</requirements>

<implementation>
Key guidance:

- **Two-way binding**: When a slider changes, update `params[key]`. This is the only binding needed since the render loop already reads from `params` each frame.

- **Auto-hide logic**: Use a `mousemove` event listener that:
  1. Shows the panel (set opacity to 1)
  2. Clears any existing hide timeout
  3. Sets a new timeout to hide panel after 3 seconds
  4. If mouse is OVER the panel itself, cancel the hide timeout (don't hide while user is adjusting)

- **Randomize with taste**: When randomizing, don't use fully random ranges - use weighted random that tends toward interesting values. For example, keep decay above 0.9 (otherwise visuals fade too fast to be interesting), keep zoom close to 1.0, etc.

- **No build tools**: All CSS can be in a `<style>` tag in `index.html` or in a separate CSS file loaded via `<link>`. No CSS preprocessors.

- **Performance**: The UI should not cause dropped frames. Use `input` events (not `change`) for real-time slider response. Avoid layout thrashing - the control panel should be positioned with `position: fixed` and not affect the canvas layout.

- **Generate presets by experimenting**: Create preset values that produce visually distinct and interesting results. Each preset should have its own character.
</implementation>

<output>
Create or modify these files:
- `./src/ui.js` - UI panel creation, controls, event handling, presets
- `./index.html` - Add styles and any needed HTML structure (modify existing)
- `./src/main.js` - Import and initialize UI module (modify existing)
- `./src/params.js` - Add preset definitions and default values getter (modify existing)
</output>

<verification>
Before declaring complete, verify:
1. Page loads showing fullscreen visuals with NO UI visible
2. Moving the mouse reveals the control panel on the right side
3. Panel auto-hides after 3 seconds of inactivity
4. Pressing Tab toggles the panel
5. Every slider updates visuals in real-time when dragged
6. Space randomizes all params and produces visually different results
7. R resets to defaults
8. F toggles fullscreen
9. Presets each produce distinct, interesting visual patterns
10. No dropped frames when interacting with the UI
11. Controls are organized into Feedback / Shape / Color groups
</verification>

<success_criteria>
- UI is invisible until mouse movement or Tab keypress
- All parameters from params.js have corresponding slider controls
- Controls update visuals in real-time with no perceptible lag
- Preset system works and each preset produces visually distinct results
- Keyboard shortcuts (Tab, Space, R, F) all function correctly
- Panel doesn't interfere with visual rendering performance
- Clean, dark-themed aesthetic that complements the visuals
</success_criteria>
