/**
 * Built-in preset loader.
 *
 * Fetches all factory preset JSON files from src/presets/ and returns
 * them as an array of preset objects with an `id` field derived from
 * the filename.
 */

const BUILT_IN_FILES = [
  'slow-drift',
  'tunnel-vision',
  'chaos-spiral',
  'breathing-pulse',
  'kaleidoscope',
  'sine-bars',
  'digital-grid',
];

/**
 * Load all built-in presets from JSON files.
 * @returns {Promise<Array<object>>} Array of preset objects, each with an `id` field.
 */
export async function loadBuiltInPresets() {
  const presets = await Promise.all(
    BUILT_IN_FILES.map(async (id) => {
      const resp = await fetch(`./src/presets/${id}.json`);
      if (!resp.ok) {
        console.warn(`Failed to load built-in preset: ${id} (${resp.status})`);
        return null;
      }
      const data = await resp.json();
      return { ...data, id };
    })
  );

  return presets.filter(Boolean);
}
