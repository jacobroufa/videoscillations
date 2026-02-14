<objective>
Consolidate the Hypnewcade UI control panel so that controls only appear when they are relevant to the currently selected mode. Controls that have no effect in the current mode should be hidden, reducing clutter and eliminating user confusion about "broken" controls.
</objective>

<context>
This is the overlay UI for a WebGL video synthesizer. The UI is built entirely in JavaScript (no framework) in `src/ui.js`. Controls are organized into groups: Feedback, Shape, Movement, Color. Each group has mode selectors (button rows) and parameter sliders.

Read these files before making changes:
- `src/ui.js` -- the entire UI implementation
- `src/params.js` -- parameter definitions and defaults (to understand which params exist)
- `src/renderer.js` -- to understand which parameters are used by which movement modes

The previous prompt (001) may have added new parameters like `movementLissajousRatio`. Account for any new parameters that exist in params.js.
</context>

<requirements>

<requirement id="1">
<title>Movement group: show only relevant speed/config controls per mode</title>
<rules>
When movementMode changes, show/hide these controls:

- **Mode 0 (Sine)**: Show `movementSpeed`, `movementAmplitude`. Hide all others (phase, spiral speed, scroll angle, scroll speed, bounce speed, lissajous ratio).
- **Mode 1 (Lissajous)**: Show `movementSpeed`, `movementAmplitude`, `movementPhase`, and `movementLissajousRatio` (if it exists from prompt 001). Hide spiral speed, scroll angle, scroll speed, bounce speed.
- **Mode 2 (Spiral)**: Show `movementSpeed`, `movementAmplitude`, `movementSpiralSpeed`. Hide phase, scroll angle, scroll speed, bounce speed, lissajous ratio.
- **Mode 3 (Scroll)**: Show `movementScrollAngle`, `movementScrollSpeed`. Hide speed, amplitude, phase, spiral speed, bounce speed, lissajous ratio.
- **Mode 4 (Bounce)**: Show `movementBounceSpeed`, `movementAmplitude`. Hide speed, phase, spiral speed, scroll angle, scroll speed, lissajous ratio.
- **Mode 5 (Fixed)**: Hide ALL movement parameter sliders.
</rules>
</requirement>

<requirement id="2">
<title>Feedback group: show kaleidoscope angle only when relevant</title>
<rules>
The `kaleidoscopeAngle` slider should only be visible when `mirrorMode` is 4 (Kal 2), 5 (Kal 4), or 6 (Kal 8). Hide it for mirror modes 0-3 (Off, H Mirror, V Mirror, Quad) since the angle parameter has no effect on those modes.
</rules>
</requirement>

<requirement id="3">
<title>Color group: show only relevant color mode controls</title>
<rules>
When colorMode changes, show/hide these controls:

- **Mode 0 (Direct)**: Hide posterize levels and all gradient hues. Show only hue speed, brightness, saturation, shape hue, shape color sat.
- **Mode 1 (Gradient)**: Show `colorGradientHue1`, `colorGradientHue2`, `colorGradientHue3`. Hide posterize levels.
- **Mode 2 (Posterize)**: Show `colorPosterizeLevels`. Hide gradient hues.
- **Mode 3 (Negative)**: Hide posterize levels and gradient hues.
- **Mode 4 (Thermal)**: Hide posterize levels and gradient hues.

Controls that are always visible regardless of color mode: hue speed, brightness, saturation, shape hue, shape color sat.
</rules>
</requirement>

<requirement id="4">
<title>Smooth show/hide transitions</title>
<rules>
When controls are shown/hidden, use CSS transitions for a smooth experience:
- Use `max-height` and `opacity` transitions (or similar) so controls slide in/out smoothly
- Transition duration: 200-300ms
- Hidden controls should have `display: none` AFTER the transition completes (to remove from layout), or use `max-height: 0; overflow: hidden; opacity: 0` approach
- Do NOT use `visibility: hidden` alone as it leaves empty space
</rules>
</requirement>

</requirements>

<implementation>
1. Read `src/ui.js` and `src/params.js` thoroughly.

2. Add a data attribute or class to each slider row element that identifies which parameter it controls, so we can target them for show/hide. For example: `row.dataset.param = key` in the `createSlider` function.

3. Create a `updateControlVisibility()` function that reads the current mode selections and shows/hides the appropriate slider rows. This function should:
   - Check `params.movementMode` and show/hide movement controls per requirement #1
   - Check `params.mirrorMode` and show/hide kaleidoscope angle per requirement #2
   - Check `params.colorMode` and show/hide color controls per requirement #3

4. Call `updateControlVisibility()`:
   - On initial panel creation (after all sliders are built)
   - Whenever a mode selector button is clicked (movement mode, mirror mode, color mode)
   - After preset load, reset, or randomize (via syncSliders)

5. For the CSS transitions, add styles either via JavaScript or by appending a `<style>` element. Use the approach:
   ```css
   .slider-row {
     max-height: 40px; /* or appropriate height */
     opacity: 1;
     overflow: hidden;
     transition: max-height 0.25s ease, opacity 0.2s ease, margin 0.25s ease;
   }
   .slider-row.hidden {
     max-height: 0;
     opacity: 0;
     margin: 0;
     padding: 0;
   }
   ```

6. To show a control: remove the `hidden` class. To hide: add the `hidden` class.

7. Do NOT change slider behavior or parameter values. This is purely a visibility change. Hidden controls should retain their current parameter values.
</implementation>

<constraints>
- Do NOT modify any shader files
- Do NOT modify renderer.js
- Do NOT add or remove parameters from params.js
- Only modify `src/ui.js` and potentially `index.html` for CSS
- Maintain all existing functionality (presets, randomize, reset, keyboard shortcuts)
- Hidden controls should NOT reset their values -- they just become invisible
</constraints>

<verification>
Before declaring complete:
1. Switch between all 6 movement modes and verify only the relevant sliders appear
2. Switch between all 7 mirror modes and verify kaleidoscope angle appears only for modes 4-6
3. Switch between all 5 color modes and verify gradient/posterize controls appear only when relevant
4. Load each preset and verify controls update correctly for the preset's mode selections
5. Click Randomize and verify controls update correctly
6. Click Reset and verify controls update correctly
7. Verify transitions are smooth (not jarring pop-in/out)
8. Verify the panel scrolls correctly with fewer visible controls
</verification>

<success_criteria>
- Every slider is only visible when it has an active effect on the output
- Mode switching produces smooth control transitions
- No functional regressions (all controls still modify their parameters when visible)
- Presets, randomize, and reset all trigger proper visibility updates
</success_criteria>
