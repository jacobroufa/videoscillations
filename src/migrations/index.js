/**
 * Preset migration runner and registry.
 *
 * Imports all migration files, sorts them by version, and applies them
 * sequentially to bring presets up to the current schema version.
 *
 * Presets without a `version` field are treated as version 0.
 */

import migration001 from './001-initial.js';
import migration002 from './002-oscillator-parity.js';

// -- Registry ---------------------------------------------------------------

/** All migrations, sorted ascending by version. */
const migrations = [
  migration001,
  migration002,
].sort((a, b) => a.version - b.version);

/** The current (latest) preset schema version. */
export const CURRENT_VERSION = 2;

// -- Public API -------------------------------------------------------------

/**
 * Check whether a preset needs migration.
 * @param {object} preset
 * @returns {boolean}
 */
export function needsMigration(preset) {
  const version = preset.version ?? 0;
  return version < CURRENT_VERSION;
}

/**
 * Migrate a single preset from its current version to CURRENT_VERSION.
 * Applies each migration step sequentially.
 * @param {object} preset - Preset object (mutated in place and returned).
 * @returns {object} The migrated preset.
 */
export function migratePreset(preset) {
  let version = preset.version ?? 0;

  for (const migration of migrations) {
    if (migration.version > version) {
      preset = migration.migrate(preset);
      version = migration.version;
    }
  }

  return preset;
}

/**
 * Migrate an array of presets, returning a new array.
 * Only presets that need migration are transformed.
 * @param {Array<object>} presets
 * @returns {Array<object>} The (potentially migrated) preset array.
 */
export function migrateAll(presets) {
  return presets.map((preset) =>
    needsMigration(preset) ? migratePreset(preset) : preset
  );
}
