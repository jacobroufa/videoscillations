<objective>
Implement a complete preset management system for the Hypnewcade video synthesizer with a tabbed UI, screenshot capture, IndexedDB persistence, import/export, and migration of built-in presets to a file-based schema.

The synthesizer currently has hardcoded presets in `src/params.js`. This task reorganizes presets into a proper system: built-in presets become read-only JSON files in `src/presets/`, user presets are stored in IndexedDB with screenshot thumbnails, and the UI gets a dedicated tabbed Presets panel with sub-tabs for built-in and user presets.
</objective>

<context>
This is a WebGL 2 video synthesizer (no build tools, no framework, native ES modules served via a static file server). Read ALL source files before implementing:

- `src/params.js` -- contains hardcoded `presets` object and `DEFAULTS`; the presets need to be migrated out
- `src/ui.js` -- overlay control panel with sliders, button selectors, mode-dependent visibility, preset buttons at top
- `src/renderer.js` -- render loop (needed for screenshot capture timing)
- `src/main.js` -- initialization entry point
- `index.html` -- CSS styles and canvas element
- `src/shaders/*.frag` -- shader files (do NOT modify)
- `src/gl.js`, `src/framebuffers.js` -- WebGL utilities (do NOT modify)

The UI is built entirely in JavaScript (no framework). The overlay panel auto-hides and is toggled with Tab. Controls are organized into groups with mode-dependent visibility using `.hidden` CSS class and `data-param` attributes.
</context>

<architecture>

<component id="1">
<title>Preset Schema</title>
<description>
Define a universal JSON schema used by both built-in and user presets. Every preset is a JSON object with this structure:

```json
{
  "name": "Preset Name",
  "description": "Optional description",
  "builtIn": false,
  "createdAt": "2026-02-13T...",
  "params": {
    "feedbackRotation": 0.01,
    "feedbackZoom": 1.005,
    ...all param key-value pairs...
  }
}
```

- `name`: Display name (user-editable for user presets, fixed for built-ins)
- `description`: Optional text (can be empty string)
- `builtIn`: Boolean flag -- true for factory presets, false for user-created
- `createdAt`: ISO 8601 timestamp
- `params`: Complete snapshot of ALL current params at save time

Screenshots are stored separately (as blobs in IndexedDB or as static files for built-ins). They are associated by preset ID/name.
</description>
</component>

<component id="2">
<title>Built-in Preset Migration</title>
<description>
Move the existing presets from `src/params.js` into individual JSON files under `src/presets/`.

Create these files:
- `src/presets/slow-drift.json`
- `src/presets/tunnel-vision.json`
- `src/presets/chaos-spiral.json`
- `src/presets/breathing-pulse.json`
- `src/presets/kaleidoscope.json`
- `src/presets/sine-bars.json`
- `src/presets/digital-grid.json`

Each file follows the preset schema above with `builtIn: true`.

Create a `src/presets/index.js` module that:
1. Imports all built-in preset JSON files (using fetch since these are static files, not ES module imports)
2. Exports an async function `loadBuiltInPresets()` that returns an array of preset objects
3. Each preset gets an `id` field derived from its filename (e.g., `"slow-drift"`)

Remove the `presets` export from `src/params.js`. The `DEFAULTS`, `getDefaults()`, and `params` exports remain.
</description>
</component>

<component id="3">
<title>IndexedDB Preset Storage</title>
<description>
Create `src/preset-store.js` -- a module that manages user preset persistence using IndexedDB.

Database: `hypnewcade-presets`, version 1
Object stores:
- `presets` -- stores preset JSON objects, keyed by `id`
- `screenshots` -- stores screenshot Blob/ArrayBuffer data, keyed by preset `id`

The module should export these async functions:

```js
// Save a new user preset. Returns the generated ID (e.g., "preset-000").
async function savePreset(presetData, screenshotBlob)

// Load all user presets (returns array of preset objects, sorted by ID).
async function loadAllPresets()

// Load a single preset by ID.
async function loadPreset(id)

// Delete a preset and its screenshot.
async function deletePreset(id)

// Rename a preset.
async function renamePreset(id, newName)

// Get screenshot blob for a preset (returns Blob or null).
async function getScreenshot(id)

// Delete only the screenshot for a preset.
async function deleteScreenshot(id)

// Replace/update the screenshot for a preset.
async function updateScreenshot(id, newBlob)

// Export all user presets as a single JSON file (triggers download).
// Include screenshots as base64 data URIs in the export.
async function exportPresets()

// Import presets from a JSON file (returns count of imported presets).
// Handles base64 screenshot data from exports.
async function importPresets(file)

// Get the next available preset ID in the "preset-NNN" sequence.
async function getNextPresetId()
```

ID generation:
- Scan existing preset IDs matching pattern `preset-NNN`
- Find the lowest unused number from 000 to 999
- Return `preset-NNN` with zero-padded 3-digit number
- If all 1000 slots are taken, throw an error
</description>
</component>

<component id="4">
<title>Screenshot Capture</title>
<description>
Create `src/screenshot.js` -- a module for capturing canvas screenshots.

```js
// Capture the current canvas frame as a Blob (PNG format).
// Must be called at the right time in the render loop (after display pass,
// before the next frame clears it). Use `preserveDrawingBuffer` consideration
// or capture synchronously after a render.
async function captureScreenshot(canvas)

// Create a thumbnail from a screenshot blob (resize to ~200x150 or similar).
// Use an offscreen canvas to resize.
async function createThumbnail(blob, maxWidth, maxHeight)
```

IMPORTANT: The WebGL context is created with `preserveDrawingBuffer: false` for performance. To capture a screenshot, you have two options:
1. Call `canvas.toBlob()` / `canvas.toDataURL()` immediately after `gl.drawArrays()` in the display pass, before `requestAnimationFrame` returns
2. Temporarily set a flag that the renderer checks, and after the display pass it calls back with the canvas data

Go with option 2: Add a `requestScreenshot(callback)` method to the Renderer class. When set, after the display pass completes (but before swap), it calls `callback(canvas)` and clears the flag. This way the capture happens at the right moment in the pipeline.
</description>
</component>

<component id="5">
<title>Tabbed UI Panel</title>
<description>
Restructure the overlay panel to have TWO top-level tabs:

**Tab 1: "Controls"** (default active)
- Contains everything currently in the panel: action buttons (randomize/reset/fullscreen), and all parameter groups (Feedback, Shape, Oscillator 2, Movement, Color)
- This is the existing UI, just moved under a tab

**Tab 2: "Presets"**
- Contains the preset management interface with two sub-tabs

The tab bar should be at the TOP of the panel, above all content. Use a simple horizontal tab bar with two buttons. Active tab gets a highlighted style. Switching tabs shows/hides the corresponding content.

**Presets Tab Layout:**

Sub-tab bar at top: "Factory" | "My Presets"

**Factory sub-tab:**
- Grid of preset cards (2 columns)
- Each card shows:
  - Preset name
  - Optional static thumbnail (if a screenshot exists in `src/presets/screenshots/`)
  - Click to load the preset
- Cards are NOT editable (no rename/delete) since these are built-in
- A subtle visual indicator that these are read-only (e.g., small lock icon or muted styling)

**My Presets sub-tab:**
- "Save Current" button at top (also accessible via keyboard shortcut 'S')
- Collapsible info notice: "Your presets are saved in this browser. Use Export to back them up or transfer to another device." -- with a small collapse/expand toggle
- Import/Export buttons row
- Grid of user preset cards (2 columns)
- Each card shows:
  - Screenshot thumbnail (or a placeholder gradient if no screenshot)
  - Preset name (editable on hover -- pencil icon)
  - Delete button on hover (trash icon)
  - Screenshot management on hover: delete screenshot (trash), or re-capture (camera icon)
  - Click to load the preset

**Card interaction details:**
- Hover reveals overlay with action icons (pencil for rename, trash for delete, camera for re-capture screenshot)
- Pencil click: turns the name into an inline text input. Enter to confirm, Escape to cancel.
- Trash click on card: confirmation prompt before deleting the preset entirely
- Trash click on screenshot: removes just the screenshot (no confirmation needed)
- Camera icon: re-captures current canvas state as new screenshot for that preset
</description>
</component>

</architecture>

<implementation>

<step order="1">
<title>Create preset schema and migrate built-in presets</title>
<files>
- Create `src/presets/slow-drift.json` (and 6 more JSON files)
- Create `src/presets/index.js`
- Modify `src/params.js` -- remove the `presets` export object, keep DEFAULTS/getDefaults/params
</files>
<details>
1. Read `src/params.js` to get all current preset data
2. For each preset, create a JSON file with the schema: `{ name, description: "", builtIn: true, createdAt: "2024-01-01T00:00:00Z", params: { ...all values... } }`
3. Create `src/presets/index.js` that fetches all JSON files and returns them
4. Remove the `presets` object from `src/params.js`
5. Update any imports of `presets` from params.js to use the new module
</details>
</step>

<step order="2">
<title>Create IndexedDB storage module</title>
<files>
- Create `src/preset-store.js`
</files>
<details>
Implement all the async functions described in component #3. Use a clean promise-based wrapper around IndexedDB (no external libraries). Handle database versioning and upgrades properly.

The ID generation (`getNextPresetId`) should:
1. Open a cursor on the presets store
2. Collect all existing IDs matching `preset-NNN`
3. Find the lowest unused number
4. Return the formatted ID

Export format for `exportPresets()`:
```json
{
  "version": 1,
  "exportedAt": "ISO timestamp",
  "presets": [
    {
      ...preset data...,
      "screenshot": "data:image/png;base64,..." or null
    }
  ]
}
```
</details>
</step>

<step order="3">
<title>Create screenshot capture module</title>
<files>
- Create `src/screenshot.js`
- Modify `src/renderer.js` -- add `requestScreenshot(callback)` method
</files>
<details>
The renderer modification should be minimal:
1. Add a `_screenshotCallback` property (null by default)
2. Add a `requestScreenshot(cb)` method that sets the callback
3. In `_tick()`, after the display pass (Pass 3) but before `pingPong.swap()`, check if callback is set:
   ```js
   if (this._screenshotCallback) {
     const cb = this._screenshotCallback;
     this._screenshotCallback = null;
     cb(this.gl.canvas);
   }
   ```
4. The screenshot module's `captureScreenshot(canvas)` calls `canvas.toBlob()` wrapped in a Promise

The thumbnail creator should use an offscreen canvas to resize to ~200px wide, maintaining aspect ratio.
</details>
</step>

<step order="4">
<title>Restructure UI with tabs and preset management</title>
<files>
- Modify `src/ui.js` -- major restructuring
- Modify `index.html` -- add CSS for tabs, preset cards, hover actions
- Modify `src/main.js` -- pass renderer reference to UI for screenshot capture
</files>
<details>
This is the largest change. Approach it carefully:

1. **Tab structure**: Wrap existing control panel content in a `controls-tab` div. Create a `presets-tab` div. Add a tab bar above both. Only one tab's content is visible at a time.

2. **Preset cards**: Create a reusable `createPresetCard(preset, options)` function that builds a card element. Options control whether hover actions (edit/delete) are shown.

3. **Factory presets sub-tab**: Load from `src/presets/index.js` at init time. Render as a grid of read-only cards.

4. **User presets sub-tab**: Load from IndexedDB at init time. Render as a grid of editable cards. Include "Save Current", "Import", "Export" buttons.

5. **Save flow**:
   - User clicks "Save Current" or presses 'S'
   - Capture screenshot via renderer
   - Generate next preset ID
   - Save params snapshot + screenshot to IndexedDB
   - Add new card to the grid with animation
   - Briefly flash/highlight the new card

6. **Load flow**:
   - User clicks a preset card
   - Apply all params from the preset
   - Call syncSliders() and updateControlVisibility()
   - Optionally switch to Controls tab to see the result

7. **Rename flow**:
   - Pencil icon click turns name into input field
   - Enter confirms, Escape cancels
   - Update name in IndexedDB

8. **Delete flow**:
   - Trash icon on card shows inline confirmation ("Delete?" with Yes/No)
   - On confirm, remove from IndexedDB and remove card from DOM with fade-out

9. **Screenshot management**:
   - Trash icon on screenshot thumbnail removes just the screenshot
   - Camera icon re-captures current canvas and updates the screenshot

10. **Import/Export**:
    - Export: calls `exportPresets()` which triggers a file download
    - Import: opens a file picker, reads the JSON, calls `importPresets()`, refreshes the grid

11. **Info notice**: A collapsible banner at the top of "My Presets" sub-tab explaining browser storage. Default: expanded on first visit, collapsed after. Store collapse state in localStorage.

12. **Keyboard shortcut**: Add 'S' key (when not focused on input) to save current state as a new preset. Capture screenshot, generate ID, save, show brief toast/notification.

Pass the renderer instance to `initUI(renderer)` so the UI can call `renderer.requestScreenshot()`.
</details>
</step>

</implementation>

<constraints>
- No external libraries or build tools. Pure vanilla JS with ES modules.
- No framework (React, Vue, etc.). All DOM manipulation is vanilla JS.
- Do NOT modify shader files, gl.js, or framebuffers.js
- Built-in presets must be immutable in the UI (no edit/delete actions)
- User presets use IndexedDB -- no server-side storage
- Screenshot capture must work with `preserveDrawingBuffer: false` (use the renderer callback approach)
- The preset panel should be scrollable if there are many presets
- All CSS should be in `index.html` (following existing pattern) or injected via JS
- Follow existing code patterns: no framework, no build step, ES modules
- The 'S' keyboard shortcut should NOT fire when the user is typing in an input field (check `e.target.tagName`)
- Maintain all existing functionality -- controls tab must work exactly as before
</constraints>

<css_guidance>
Add styles for these new elements (following the existing dark translucent aesthetic):

- `.tab-bar` -- horizontal bar at panel top, dark background
- `.tab-btn` -- tab button, subtle text, highlighted when active
- `.tab-content` -- container for each tab's content, hidden when inactive
- `.sub-tab-bar` -- smaller tab bar for Factory/My Presets
- `.preset-grid` -- CSS grid, 2 columns, gap
- `.preset-card` -- dark card with rounded corners, thumbnail area, name
- `.preset-card:hover` -- subtle border highlight
- `.preset-card .hover-actions` -- overlay that appears on hover with action icons
- `.preset-card .thumbnail` -- fixed aspect ratio container for screenshot
- `.preset-card .placeholder-thumb` -- gradient placeholder when no screenshot
- `.info-notice` -- collapsible info banner, muted styling
- `.save-btn`, `.import-btn`, `.export-btn` -- action buttons
- `.inline-edit` -- inline text input for rename
- `.confirm-delete` -- inline delete confirmation

Use the existing color scheme: dark backgrounds (~rgba(0,0,0,0.7-0.85)), bright accent text (#0ff cyan, white), translucent panels.
</css_guidance>

<verification>
Before declaring complete, verify:

1. **Tab switching**: Controls and Presets tabs switch cleanly, no content overlap
2. **Factory presets**: All 7 built-in presets load correctly from JSON files, appear in Factory sub-tab
3. **Save preset**: Click "Save Current" -- screenshot captured, preset saved to IndexedDB, card appears
4. **Load preset**: Click any preset card -- all params applied, sliders update, visualization changes
5. **Rename**: Pencil icon works, inline edit saves to IndexedDB
6. **Delete**: Trash icon shows confirmation, deletion removes from IndexedDB and DOM
7. **Screenshot management**: Can delete screenshot (shows placeholder), can re-capture
8. **Export**: Downloads a JSON file containing all user presets with embedded screenshots
9. **Import**: File picker opens, presets load into IndexedDB, grid refreshes
10. **Keyboard shortcut**: 'S' key saves a preset (only when not in input field)
11. **Info notice**: Shows on first visit, can be collapsed, stays collapsed across sessions
12. **Preset ID sequence**: First save is `preset-000`, second is `preset-001`, etc.
13. **No regressions**: All synth controls, randomize, reset, fullscreen still work
14. **Page reload**: User presets persist after browser refresh
15. **Built-in presets**: Cannot be renamed or deleted (no hover actions on factory cards)
</verification>

<success_criteria>
- Two-tab UI (Controls / Presets) with smooth switching
- Factory presets loaded from `src/presets/*.json`, displayed as read-only cards
- User presets saved to IndexedDB with auto-generated `preset-NNN` IDs
- Screenshot capture and thumbnail display on preset cards
- Full CRUD: create, load, rename, delete presets and screenshots
- Import/export as JSON files with embedded screenshot data
- Collapsible browser storage info notice
- 'S' keyboard shortcut for quick save
- All existing synth functionality preserved
- `src/params.js` no longer contains preset definitions
</success_criteria>
