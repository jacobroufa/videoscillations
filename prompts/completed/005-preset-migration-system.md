<objective>
Implement a versioned preset migration system for the Hypnewcade video synthesizer. This creates the infrastructure to safely evolve parameter schemas over time: every preset (built-in JSON files and user IndexedDB presets) carries a version number, and migration transformers upgrade old presets to the current schema at app startup.

Additionally, codify a CLAUDE.md rule that any future parameter changes MUST include a corresponding migration.
</objective>

<context>
This is a WebGL 2 video synthesizer with two preset storage mechanisms:
- **Built-in presets**: JSON files in `src/presets/*.json`, loaded via `src/presets/index.js`
- **User presets**: Stored in IndexedDB via `src/preset-store.js`

Both follow the same schema:
```json
{
  "name": "...",
  "description": "...",
  "builtIn": true/false,
  "createdAt": "ISO timestamp",
  "params": { ...all parameter key-value pairs... }
}
```

Read ALL source files before implementing:
- `src/params.js` -- DEFAULTS object defines the current parameter schema
- `src/preset-store.js` -- IndexedDB storage (savePreset, loadAllPresets, etc.)
- `src/presets/index.js` -- loads built-in preset JSON files
- `src/presets/*.json` -- 7 built-in preset files
- `src/ui.js` -- initUI() is called at startup
- `src/main.js` -- app entry point, initialization sequence

The next prompt (006) will make major parameter changes (renaming, adding, removing params for oscillator parity). This migration system must be in place FIRST so that prompt can write a proper migration.
</context>

<requirements>

<requirement id="1">
<title>Version number on all presets</title>
<details>
Add a `version` field to the preset schema. The current parameter set (before any changes from the next prompt) is version `1`.

- Add `"version": 1` to all 7 built-in preset JSON files in `src/presets/`
- Modify `src/preset-store.js` so that `savePreset()` automatically sets `version` to the current schema version (imported from the migration module)
- User presets already in IndexedDB without a `version` field should be treated as version `0` (pre-versioning) by the migration system
</details>
</requirement>

<requirement id="2">
<title>Migration transformer directory</title>
<details>
Create `src/migrations/` directory with this structure:

```
src/migrations/
  index.js          -- migration runner and registry
  001-initial.js    -- first migration: v0 → v1 (adds version field, no param changes)
```

Each migration file exports:
```js
export default {
  version: 1,           // the version this migration upgrades TO
  description: 'Add version field to presets',
  migrate(preset) {
    // Transform the preset object in-place or return a new one.
    // This function receives the full preset object (not just params).
    // Must return the transformed preset.
    preset.version = 1;
    return preset;
  }
};
```

Migration files use incrementing numeric prefixes: `001-*.js`, `002-*.js`, etc.
Each migration upgrades from `version - 1` to `version`.
</details>
</requirement>

<requirement id="3">
<title>Migration runner</title>
<details>
Create `src/migrations/index.js` that exports:

```js
// The current schema version (always matches the highest migration version).
export const CURRENT_VERSION = 1;

// Run all necessary migrations on a single preset object.
// Returns the migrated preset (or the original if already current).
export function migratePreset(preset) { ... }

// Run migrations on an array of presets.
// Returns the array with all presets upgraded to CURRENT_VERSION.
export function migrateAll(presets) { ... }

// Check if a preset needs migration.
export function needsMigration(preset) { ... }
```

The runner should:
1. Import all migration files from the directory
2. Sort them by version number
3. For a given preset, determine its current version (default 0 if missing)
4. Apply each migration sequentially from `currentVersion + 1` to `CURRENT_VERSION`
5. Return the fully upgraded preset

Since this is vanilla JS with no build tools, the migration files must be explicitly imported in `index.js` (not dynamically scanned). When adding a new migration, you also update the imports in `index.js` and bump `CURRENT_VERSION`.
</details>
</requirement>

<requirement id="4">
<title>Run migrations at app startup</title>
<details>
Migrations must run BEFORE the app renders or loads any preset. The goal is to upgrade all stored presets once, so loading a preset later is instant (no on-the-fly migration).

In `src/main.js`, add a migration step early in the `main()` function:

```js
// 1. Run migrations on user presets in IndexedDB
await migrateUserPresets();

// 2. Then continue with normal initialization...
```

Create a function (in `src/preset-store.js` or a new module) that:
1. Loads all user presets from IndexedDB
2. Checks each for `needsMigration()`
3. Runs `migratePreset()` on any that need it
4. Saves the migrated presets back to IndexedDB
5. Logs how many presets were migrated (for debugging)

For built-in presets: Since these are JSON files we control, they should always be at the current version (we update them when we write migrations). The migration runner should still handle them gracefully in case a cached version is served.
</details>
</requirement>

<requirement id="5">
<title>Ensure new presets get the current version</title>
<details>
Modify `savePreset()` in `src/preset-store.js` to automatically stamp `version: CURRENT_VERSION` on any preset being saved. This ensures newly created user presets always have the latest version.

Import `CURRENT_VERSION` from `src/migrations/index.js`.
</details>
</requirement>

<requirement id="6">
<title>CLAUDE.md project rule</title>
<details>
Create a `CLAUDE.md` file in the project root with this rule (among any other project conventions worth documenting):

```markdown
# Hypnewcade Project Rules

## Preset Migration Requirement

**Any change to parameters that affects presets MUST include a corresponding migration.**

When you add, remove, rename, or change the default value of any parameter in `src/params.js` DEFAULTS:

1. Create a new migration file in `src/migrations/` with the next sequential number (e.g., `002-description.js`)
2. The migration must transform old presets to the new schema:
   - **Added params**: Set to the new default value
   - **Removed params**: Delete from the preset's params object
   - **Renamed params**: Copy the old value to the new key, delete the old key
   - **Changed defaults**: Only update if the preset had the OLD default value (preserve user customizations)
3. Update `CURRENT_VERSION` in `src/migrations/index.js`
4. Add the import for the new migration in `src/migrations/index.js`
5. Update ALL built-in preset JSON files in `src/presets/` to the new version and schema
6. Test that existing user presets (which may be at any prior version) migrate correctly

This ensures presets saved by users are never broken by parameter evolution.
```
</details>
</requirement>

</requirements>

<implementation>

<step order="1">
<title>Create the migrations directory and runner</title>
<files>
- Create `src/migrations/index.js`
- Create `src/migrations/001-initial.js`
</files>
<details>
The initial migration (001) simply adds `version: 1` to presets that don't have a version field. No parameter changes -- this establishes the baseline.

`src/migrations/index.js` should:
1. Import the migration from `001-initial.js`
2. Store migrations in a sorted array
3. Export `CURRENT_VERSION`, `migratePreset()`, `migrateAll()`, `needsMigration()`
</details>
</step>

<step order="2">
<title>Add version to built-in presets</title>
<files>
- Modify all 7 JSON files in `src/presets/`
</files>
<details>
Add `"version": 1` to each built-in preset JSON file, right after the `"builtIn"` field.
</details>
</step>

<step order="3">
<title>Wire up migrations at startup</title>
<files>
- Modify `src/preset-store.js` -- add migration function, stamp version on save
- Modify `src/main.js` -- call migrations before other initialization
</files>
<details>
In `preset-store.js`:
- Import `CURRENT_VERSION`, `migratePreset`, `needsMigration` from migrations
- Add `async function migrateUserPresets()` that loads, migrates, and saves back
- Export `migrateUserPresets`
- Modify `savePreset()` to set `version: CURRENT_VERSION`

In `main.js`:
- Import `migrateUserPresets` from preset-store
- Call `await migrateUserPresets()` early in `main()`, before renderer/UI init
</details>
</step>

<step order="4">
<title>Create CLAUDE.md</title>
<files>
- Create `CLAUDE.md` in project root
</files>
<details>
Write the preset migration rule as specified in requirement #6. Include any other useful project conventions discovered from the codebase (tech stack, no build tools, vanilla JS, ES modules, etc.).
</details>
</step>

</implementation>

<constraints>
- No external libraries or build tools. Pure vanilla JS with ES modules.
- Migrations must be synchronous transforms (no async in the migrate function itself)
- The migration runner startup call in main.js is async (IndexedDB operations)
- Do NOT change any existing parameter names or values -- that's the next prompt's job
- The 001-initial migration should be a no-op for params (just adds version field)
- Do NOT modify shader files, gl.js, or framebuffers.js
- Keep the CLAUDE.md concise and actionable
</constraints>

<verification>
Before declaring complete:
1. `src/migrations/001-initial.js` exists and exports a valid migration object
2. `src/migrations/index.js` exports `CURRENT_VERSION` (1), `migratePreset`, `migrateAll`, `needsMigration`
3. All 7 built-in preset JSON files have `"version": 1`
4. `preset-store.js` has `migrateUserPresets()` function that loads, migrates, saves
5. `preset-store.js` `savePreset()` stamps `version: CURRENT_VERSION`
6. `main.js` calls `migrateUserPresets()` before UI/renderer init
7. `CLAUDE.md` exists with the preset migration rule
8. App still loads and functions correctly (no regressions)
9. A preset without a `version` field would be upgraded to version 1 on startup
</verification>

<success_criteria>
- Migration infrastructure is in place and working
- All presets carry version numbers
- Startup migration upgrades old IndexedDB presets automatically
- New presets are stamped with current version
- CLAUDE.md codifies the migration requirement for future sessions
- Zero parameter changes -- this is infrastructure only
</success_criteria>
