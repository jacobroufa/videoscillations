# Hypnewcade -- Project Rules

## Tech stack

- Vanilla JavaScript with ES modules (no build tools, no bundler)
- WebGL 2 for rendering (shaders in `src/shaders/`)
- No external libraries or dependencies

## Preset migration rule

Any change to parameters that affects presets MUST include a corresponding migration.

Steps:

1. Create a new migration file in `src/migrations/` with the next sequential number (e.g. `002-add-new-param.js`).
2. The migration must transform old presets to the new schema (add, remove, or rename params with sensible defaults).
3. Bump `CURRENT_VERSION` in `src/migrations/index.js`.
4. Add the import for the new migration file in `src/migrations/index.js` and append it to the `migrations` array.
5. Update all built-in preset JSON files in `src/presets/` to the new version and schema.
6. Verify that existing user presets (IndexedDB) migrate correctly on startup.
