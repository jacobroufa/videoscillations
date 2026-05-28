# videoscillations

A browser-based video synthesizer. Two procedural oscillators are blended into a feedback loop and run through optional mirror/kaleidoscope transforms to produce continuously evolving, hypnotic visuals.

Built with vanilla JavaScript ES modules and WebGL 2. No build step, no dependencies.

## Running

Because the app uses ES modules and `fetch` to load shaders and presets, it needs to be served over HTTP (opening `index.html` directly via `file://` will not work).

Any static file server works. From the project root:

```sh
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

A WebGL 2 capable browser is required (current Chrome, Firefox, Safari, or Edge).

## Controls

The UI panel is hidden by default. Hover the right edge of the window or press `Tab` to reveal it; it auto-hides when the cursor leaves.

| Key     | Action               |
| ------- | -------------------- |
| `Tab`   | Toggle the UI panel  |
| `Space` | Randomize parameters |
| `R`     | Reset to defaults    |
| `F`     | Toggle fullscreen    |
| `S`     | Save current as preset |

Each slider label is clickable to reset that individual parameter to its default.

## What you can tweak

- **Feedback transforms** — rotation, zoom, x/y shift, decay, and a blend mode that decides how the previous frame mixes with the new one.
- **Mirror / kaleidoscope** — horizontal, vertical, quadrant, and 2/4/8-wedge kaleidoscope modes with adjustable angle, applied to the feedback layer, shape layer, both, or final output.
- **Two oscillators** — independently configurable with:
  - Waveform (sine, tan, square, circle, diamond, triangle)
  - Frequency, angle, thickness, softness, phase
  - Polarization (UV rotation, optionally auto-rotating)
  - Fractal folds with adjustable axis
  - Angle LFO (sine, triangle, sawtooth, square, sample & hold)
  - Hue and saturation
  - Movement mode (sine, Lissajous, spiral, scroll, bounce, fixed) with mode-specific parameters
  - Blend mode (add, multiply, mask, difference, phase mod)

## Presets

A handful of factory presets ship with the app. You can also save your own — they are stored in IndexedDB in the browser, and the panel supports rename, delete, export, and import.

If you change anything that affects the preset schema, follow the migration rules in the project so existing user presets continue to load. See `src/migrations/` for examples.

## Project layout

```
index.html              # Entry page + UI styles
src/
  main.js               # Bootstrap: GL init, shader load, render loop
  gl.js                 # WebGL helpers
  framebuffers.js       # Ping-pong framebuffer for feedback
  renderer.js           # Per-frame pipeline (shape → feedback → composite)
  params.js             # All tunable parameters + defaults
  ui.js                 # Overlay panel, sliders, presets, keybindings
  preset-store.js       # IndexedDB CRUD + import/export
  screenshot.js         # Canvas → PNG capture
  presets/              # Built-in preset JSON files
  migrations/           # Preset schema migrations
  shaders/              # GLSL: shape, feedback, composite, fullscreen vert
```

## License

MIT — see [LICENSE](LICENSE). Copy, modify, and use it however you like; just keep the copyright notice and license text with substantial copies.
