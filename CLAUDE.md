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

## Git commit rules

1. **Atomic commits**: Each discrete, self-contained change gets its own git commit. A "discrete change" is the smallest set of modifications that leaves the codebase in a fully working state.
2. **Never commit broken state**: Every commit must leave the application in a working state. If a change spans multiple files but they all must change together to work, that is one commit. If changes are independent, they are separate commits.
3. **Commit granularity per prompt**: A single prompt execution may produce one commit (simple change) or multiple commits (complex prompt with independent stages). The number of commits should match the number of discrete working changes, not be artificially collapsed into one.
4. **Commit message format**: Use conventional commits (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`) with concise, lowercase descriptions.
5. **Stage specific files**: Always `git add` specific files by name. Never use `git add .` or `git add -A`.
