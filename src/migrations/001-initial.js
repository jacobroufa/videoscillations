/**
 * Migration 001: v0 -> v1
 *
 * Adds the `version` field to presets. No parameter changes -- this
 * establishes the baseline version for the migration system.
 */

export default {
  version: 1,
  description: 'Add version field to presets',
  migrate(preset) {
    preset.version = 1;
    return preset;
  }
};
