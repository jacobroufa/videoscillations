<objective>
Add a "click-to-home" feature to the Hypnewcade video synthesizer UI: clicking on a slider control's label text resets that parameter to its default value from params.js DEFAULTS.

Read `./CLAUDE.md` for project conventions, especially git commit rules.
</objective>

<context>
This is a WebGL 2 video synthesizer (vanilla JS, no build tools) with an overlay control panel. Sliders are created by the `createSlider()` function in `./src/ui.js`. Each slider row has a label, range input, and value display.

Key files:
- `./src/ui.js` — UI creation, slider factory, event handling
- `./src/params.js` — Central parameter store with `DEFAULTS` object and `getDefaults()` export
- `./index.html` — CSS styles for the UI

The `createSlider()` function (around line 1190 of ui.js) creates each slider row with:
- A `<label>` element with class `slider-label` containing the display name
- An `<input type="range">` with class `slider-input`
- A `<span>` with class `slider-value` showing the numeric value
- The `sliderElements` map stores `{ input, valueEl, def }` keyed by param name
</context>

<requirements>

1. **Click handler on slider labels**: When the user clicks on a slider's label text, reset that specific parameter to its default value from `getDefaults()`.

2. **Visual feedback**:
   - Add `cursor: pointer` to `.slider-label` in the CSS so users know labels are clickable
   - Briefly flash the label (e.g., a quick color change or opacity pulse) on click to confirm the action

3. **Immediate update**: After resetting the value:
   - Update `params[key]` to the default value
   - Update the slider input element's `.value`
   - Update the value display text
   - If the param affects visibility (like movement mode), call `updateControlVisibility()`

4. **Implementation approach**:
   - In `createSlider()`, add a click event listener to the `labelEl`
   - Import `getDefaults` (already imported) to look up the default value
   - Use the existing `sliderElements[key]` reference to update the input and value display
   - Use the existing `formatValue()` helper for the value text

5. **Edge cases**:
   - Only apply to slider controls (not button selectors like waveform, blend mode, etc.)
   - The default value must be clamped to the slider's min/max range (it should already be within range, but be safe)

</requirements>

<implementation>
In `createSlider()` function, add a click handler to labelEl:

```javascript
labelEl.style.cursor = 'pointer';
labelEl.addEventListener('click', () => {
  const defaults = getDefaults();
  if (key in defaults) {
    const defaultVal = defaults[key];
    params[key] = defaultVal;
    input.value = defaultVal;
    valueEl.textContent = formatValue(defaultVal, def.step);
  }
});
```

In index.html CSS, add a hover/active style for `.slider-label`:
```css
.slider-label:hover {
  color: #0ff;
}
.slider-label:active {
  opacity: 0.6;
}
```
</implementation>

<output>
Modify these files:
- `./src/ui.js` — Add click handler in `createSlider()` function
- `./index.html` — Add CSS for clickable label hover/active states
</output>

<verification>
1. Click on any slider label (e.g., "Frequency", "Rotation", "Thickness")
2. Verify the slider snaps to its default value
3. Verify the value display updates immediately
4. Verify the slider thumb position matches the new value
5. Verify cursor changes to pointer on hover over labels
6. Verify visual feedback (hover color, active opacity) works
7. Change a slider, click its label — confirm it resets to the original default, not the changed value
8. Commit as a single atomic change per CLAUDE.md git rules
</verification>

<success_criteria>
- Clicking any slider label resets that param to its default from DEFAULTS
- The slider input, value display, and params object all update in sync
- Visual affordance (pointer cursor, hover color) indicates labels are clickable
- No other controls (buttons, selectors) are affected
- Existing slider drag behavior is unchanged
</success_criteria>
