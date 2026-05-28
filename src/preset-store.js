/**
 * IndexedDB-backed storage for user presets.
 *
 * Database: videoscillations-presets, version 1
 * Object stores:
 *   - presets   -- preset JSON objects keyed by id
 *   - screenshots -- screenshot Blob data keyed by preset id
 */

import { CURRENT_VERSION, migratePreset, needsMigration } from './migrations/index.js';

const DB_NAME = 'videoscillations-presets';
const DB_VERSION = 1;

// -------------------------------------------------------------------------
// Database initialization
// -------------------------------------------------------------------------

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('presets')) {
        db.createObjectStore('presets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('screenshots')) {
        db.createObjectStore('screenshots', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// -------------------------------------------------------------------------
// ID generation
// -------------------------------------------------------------------------

/**
 * Get the next available preset ID in the "preset-NNN" sequence.
 * Scans existing IDs and finds the lowest unused number from 000 to 999.
 * @returns {Promise<string>}
 */
export async function getNextPresetId() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readonly');
    const store = tx.objectStore('presets');
    const request = store.getAllKeys();

    request.onsuccess = () => {
      const existingIds = new Set(request.result);
      for (let i = 0; i < 1000; i++) {
        const id = `preset-${String(i).padStart(3, '0')}`;
        if (!existingIds.has(id)) {
          resolve(id);
          return;
        }
      }
      reject(new Error('All 1000 preset slots are taken.'));
    };

    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------------------
// CRUD operations
// -------------------------------------------------------------------------

/**
 * Save a new user preset. Returns the generated ID.
 * @param {object} presetData - Preset object (name, params, etc). ID will be auto-assigned.
 * @param {Blob|null} screenshotBlob - Optional screenshot blob.
 * @returns {Promise<string>} The generated preset ID.
 */
export async function savePreset(presetData, screenshotBlob = null) {
  const id = await getNextPresetId();
  const preset = {
    ...presetData,
    id,
    version: CURRENT_VERSION,
    builtIn: false,
    createdAt: presetData.createdAt || new Date().toISOString(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['presets', 'screenshots'], 'readwrite');
    tx.objectStore('presets').put(preset);

    if (screenshotBlob) {
      tx.objectStore('screenshots').put({ id, blob: screenshotBlob });
    }

    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load all user presets, sorted by ID.
 * @returns {Promise<Array<object>>}
 */
export async function loadAllPresets() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readonly');
    const request = tx.objectStore('presets').getAll();

    request.onsuccess = () => {
      const presets = request.result;
      presets.sort((a, b) => a.id.localeCompare(b.id));
      resolve(presets);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Load a single preset by ID.
 * @param {string} id
 * @returns {Promise<object|undefined>}
 */
export async function loadPreset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readonly');
    const request = tx.objectStore('presets').get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a preset and its screenshot.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePreset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['presets', 'screenshots'], 'readwrite');
    tx.objectStore('presets').delete(id);
    tx.objectStore('screenshots').delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Rename a preset.
 * @param {string} id
 * @param {string} newName
 * @returns {Promise<void>}
 */
export async function renamePreset(id, newName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readwrite');
    const store = tx.objectStore('presets');
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const preset = getReq.result;
      if (!preset) {
        reject(new Error(`Preset not found: ${id}`));
        return;
      }
      preset.name = newName;
      store.put(preset);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------------------
// Migration
// -------------------------------------------------------------------------

/**
 * Migrate all user presets in IndexedDB to the current schema version.
 * Loads every preset, checks if it needs migration, applies migrations,
 * and saves migrated presets back.
 * @returns {Promise<number>} Count of migrated presets.
 */
export async function migrateUserPresets() {
  const presets = await loadAllPresets();
  let migratedCount = 0;

  const db = await openDB();

  for (const preset of presets) {
    if (!needsMigration(preset)) continue;

    const migrated = migratePreset(preset);
    await new Promise((resolve, reject) => {
      const tx = db.transaction('presets', 'readwrite');
      tx.objectStore('presets').put(migrated);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    migratedCount++;
  }

  if (migratedCount > 0) {
    console.log(`Migrated ${migratedCount} user preset(s) to version ${CURRENT_VERSION}.`);
  }

  return migratedCount;
}

// -------------------------------------------------------------------------
// Screenshot operations
// -------------------------------------------------------------------------

/**
 * Get screenshot blob for a preset.
 * @param {string} id
 * @returns {Promise<Blob|null>}
 */
export async function getScreenshot(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('screenshots', 'readonly');
    const request = tx.objectStore('screenshots').get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.blob : null);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete only the screenshot for a preset.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteScreenshot(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('screenshots', 'readwrite');
    tx.objectStore('screenshots').delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Replace/update the screenshot for a preset.
 * @param {string} id
 * @param {Blob} newBlob
 * @returns {Promise<void>}
 */
export async function updateScreenshot(id, newBlob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('screenshots', 'readwrite');
    tx.objectStore('screenshots').put({ id, blob: newBlob });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// -------------------------------------------------------------------------
// Import / Export
// -------------------------------------------------------------------------

/**
 * Convert a Blob to a base64 data URI string.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a base64 data URI string to a Blob.
 * @param {string} dataURI
 * @returns {Blob}
 */
function base64ToBlob(dataURI) {
  const [header, data] = dataURI.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

/**
 * Export all user presets as a single JSON file (triggers download).
 * Screenshots are included as base64 data URIs.
 * @returns {Promise<void>}
 */
export async function exportPresets() {
  const presets = await loadAllPresets();

  const exportData = [];
  for (const preset of presets) {
    const entry = { ...preset };
    const screenshotBlob = await getScreenshot(preset.id);
    if (screenshotBlob) {
      entry.screenshot = await blobToBase64(screenshotBlob);
    }
    exportData.push(entry);
  }

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `videoscillations-presets-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import presets from a JSON file.
 * Handles base64 screenshot data from exports.
 * @param {File} file
 * @returns {Promise<number>} Count of imported presets.
 */
export async function importPresets(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!Array.isArray(data)) {
    throw new Error('Invalid preset file: expected an array.');
  }

  let count = 0;
  for (const entry of data) {
    if (!entry.name || !entry.params) continue;

    // Extract screenshot data before saving.
    const screenshotData = entry.screenshot;
    delete entry.screenshot;

    // Remove the old ID -- a new one will be generated.
    delete entry.id;

    let screenshotBlob = null;
    if (screenshotData && typeof screenshotData === 'string') {
      try {
        screenshotBlob = base64ToBlob(screenshotData);
      } catch (e) {
        console.warn('Failed to decode screenshot for preset:', entry.name, e);
      }
    }

    await savePreset(entry, screenshotBlob);
    count++;
  }

  return count;
}
