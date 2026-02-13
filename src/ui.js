/**
 * Overlay UI for the Hypnewcade video synthesizer.
 *
 * Creates a translucent control panel on the right side of the screen
 * that auto-hides after inactivity. All controls map directly to the
 * params object in params.js.
 */

import { params, getDefaults, presets } from './params.js';

// -------------------------------------------------------------------------
// Control definitions -- maps each param to its slider config.
// -------------------------------------------------------------------------

const CONTROL_DEFS = {
  // Feedback group
  feedbackRotation:   { label: 'Rotation',       min: -0.1,  max: 0.1,  step: 0.001,  group: 'Feedback' },
  feedbackZoom:       { label: 'Zoom',            min: 0.95,  max: 1.05, step: 0.001,  group: 'Feedback' },
  feedbackXShift:     { label: 'X Shift',         min: -0.05, max: 0.05, step: 0.001,  group: 'Feedback' },
  feedbackYShift:     { label: 'Y Shift',         min: -0.05, max: 0.05, step: 0.001,  group: 'Feedback' },
  feedbackDecay:      { label: 'Decay',           min: 0.8,   max: 1.0,  step: 0.005,  group: 'Feedback' },

  // Shape group
  shapeFreqX:         { label: 'Freq X',          min: 0.0,   max: 5.0,  step: 0.01,   group: 'Shape' },
  shapeFreqY:         { label: 'Freq Y',          min: 0.0,   max: 5.0,  step: 0.01,   group: 'Shape' },
  shapeRadius:        { label: 'Radius',          min: 0.01,  max: 0.3,  step: 0.005,  group: 'Shape' },
  shapeRadiusModAmt:  { label: 'Mod Amount',      min: 0.0,   max: 0.1,  step: 0.005,  group: 'Shape' },
  shapeRadiusModFreq: { label: 'Mod Frequency',   min: 0.0,   max: 5.0,  step: 0.01,   group: 'Shape' },
  shapeSoftness:      { label: 'Softness',        min: 0.0,   max: 0.1,  step: 0.005,  group: 'Shape' },

  // Color group
  hueRotationSpeed:   { label: 'Hue Speed',       min: 0.0,   max: 0.05, step: 0.0005, group: 'Color' },
  baseBrightness:     { label: 'Brightness',      min: 0.0,   max: 2.0,  step: 0.05,   group: 'Color' },
  saturation:         { label: 'Saturation',      min: 0.0,   max: 2.0,  step: 0.05,   group: 'Color' },
};

// Group ordering
const GROUPS = ['Feedback', 'Shape', 'Color'];

// -------------------------------------------------------------------------
// Weighted random ranges for "randomize with taste".
// Each entry: [min, max] -- biased toward values that look good.
// -------------------------------------------------------------------------

const RANDOM_RANGES = {
  feedbackRotation:   { min: -0.04,  max: 0.04  },
  feedbackZoom:       { min: 0.995,  max: 1.015 },
  feedbackXShift:     { min: -0.005, max: 0.005 },
  feedbackYShift:     { min: -0.005, max: 0.005 },
  feedbackDecay:      { min: 0.91,   max: 0.99  },
  shapeFreqX:         { min: 0.0,    max: 2.5   },
  shapeFreqY:         { min: 0.0,    max: 2.5   },
  shapeRadius:        { min: 0.03,   max: 0.18  },
  shapeRadiusModAmt:  { min: 0.0,    max: 0.08  },
  shapeRadiusModFreq: { min: 0.1,    max: 3.0   },
  shapeSoftness:      { min: 0.005,  max: 0.06  },
  hueRotationSpeed:   { min: 0.0005, max: 0.01  },
  baseBrightness:     { min: 0.7,    max: 1.4   },
  saturation:         { min: 0.6,    max: 1.6   },
};

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

let panel = null;
let hideTimeout = null;
let mouseOverPanel = false;
let sliderElements = {};  // key -> input element, for syncing on preset/reset

const HIDE_DELAY = 3000; // ms

// -------------------------------------------------------------------------
// Panel creation
// -------------------------------------------------------------------------

function createPanel() {
  panel = document.createElement('div');
  panel.id = 'synth-panel';
  panel.setAttribute('aria-label', 'Synthesizer controls');

  // Track mouse enter/leave on the panel itself.
  panel.addEventListener('mouseenter', () => { mouseOverPanel = true; clearHideTimeout(); });
  panel.addEventListener('mouseleave', () => { mouseOverPanel = false; scheduleHide(); });

  // -- Preset selector ----------------------------------------------------
  const presetSection = document.createElement('div');
  presetSection.className = 'panel-section';

  const presetLabel = document.createElement('h3');
  presetLabel.className = 'section-label';
  presetLabel.textContent = 'Presets';
  presetSection.appendChild(presetLabel);

  const presetRow = document.createElement('div');
  presetRow.className = 'preset-row';

  for (const name of Object.keys(presets)) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => applyPreset(name));
    presetRow.appendChild(btn);
  }

  presetSection.appendChild(presetRow);
  panel.appendChild(presetSection);

  // -- Action buttons -----------------------------------------------------
  const actionsSection = document.createElement('div');
  actionsSection.className = 'panel-section actions-row';

  const randomBtn = document.createElement('button');
  randomBtn.className = 'action-btn';
  randomBtn.textContent = 'Randomize (Space)';
  randomBtn.addEventListener('click', randomizeParams);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'action-btn';
  resetBtn.textContent = 'Reset (R)';
  resetBtn.addEventListener('click', resetParams);

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'action-btn';
  fullscreenBtn.textContent = 'Fullscreen (F)';
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  actionsSection.appendChild(randomBtn);
  actionsSection.appendChild(resetBtn);
  actionsSection.appendChild(fullscreenBtn);
  panel.appendChild(actionsSection);

  // -- Grouped parameter sliders ------------------------------------------
  for (const group of GROUPS) {
    const section = document.createElement('div');
    section.className = 'panel-section';

    const heading = document.createElement('h3');
    heading.className = 'section-label';
    heading.textContent = group;
    section.appendChild(heading);

    for (const [key, def] of Object.entries(CONTROL_DEFS)) {
      if (def.group !== group) continue;
      section.appendChild(createSlider(key, def));
    }

    panel.appendChild(section);
  }

  // -- Keyboard hint at the bottom ----------------------------------------
  const hint = document.createElement('div');
  hint.className = 'keyboard-hint';
  hint.innerHTML = '<kbd>Tab</kbd> toggle UI &nbsp; <kbd>Space</kbd> randomize &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>F</kbd> fullscreen';
  panel.appendChild(hint);

  document.body.appendChild(panel);
}

// -------------------------------------------------------------------------
// Slider control factory
// -------------------------------------------------------------------------

function createSlider(key, def) {
  const row = document.createElement('div');
  row.className = 'slider-row';

  const labelEl = document.createElement('label');
  labelEl.className = 'slider-label';
  labelEl.textContent = def.label;

  const valueEl = document.createElement('span');
  valueEl.className = 'slider-value';
  valueEl.textContent = formatValue(params[key], def.step);

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'slider-input';
  input.min = def.min;
  input.max = def.max;
  input.step = def.step;
  input.value = params[key];

  // Real-time update on drag.
  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    params[key] = val;
    valueEl.textContent = formatValue(val, def.step);
  });

  // Store reference for external sync (preset/reset).
  sliderElements[key] = { input, valueEl, def };

  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(valueEl);
  return row;
}

/** Format a number with a reasonable number of decimals based on step size. */
function formatValue(val, step) {
  // Count decimals in step to determine display precision.
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return val.toFixed(decimals);
}

// -------------------------------------------------------------------------
// Sync all sliders to current params (after preset/reset/randomize).
// -------------------------------------------------------------------------

function syncSliders() {
  for (const [key, { input, valueEl, def }] of Object.entries(sliderElements)) {
    input.value = params[key];
    valueEl.textContent = formatValue(params[key], def.step);
  }
}

// -------------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------------

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  for (const [key, val] of Object.entries(preset)) {
    params[key] = val;
  }
  syncSliders();
}

function resetParams() {
  const defaults = getDefaults();
  for (const [key, val] of Object.entries(defaults)) {
    params[key] = val;
  }
  syncSliders();
}

function randomizeParams() {
  for (const [key, range] of Object.entries(RANDOM_RANGES)) {
    const rMin = range.min;
    const rMax = range.max;
    // Snap to the step grid defined for the control.
    const def = CONTROL_DEFS[key];
    if (def) {
      const raw = rMin + Math.random() * (rMax - rMin);
      params[key] = snapToStep(raw, def.step, def.min, def.max);
    }
  }
  syncSliders();
}

function snapToStep(value, step, min, max) {
  const snapped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// -------------------------------------------------------------------------
// Show / hide logic
// -------------------------------------------------------------------------

function showPanel() {
  if (panel) panel.classList.add('visible');
}

function hidePanel() {
  if (panel) panel.classList.remove('visible');
}

function clearHideTimeout() {
  if (hideTimeout !== null) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
}

function scheduleHide() {
  clearHideTimeout();
  hideTimeout = setTimeout(() => {
    if (!mouseOverPanel) {
      hidePanel();
    }
  }, HIDE_DELAY);
}

// -------------------------------------------------------------------------
// Event listeners
// -------------------------------------------------------------------------

function setupEvents() {
  // Mouse movement shows panel and schedules hide.
  document.addEventListener('mousemove', () => {
    showPanel();
    scheduleHide();
  });

  // Keyboard shortcuts.
  document.addEventListener('keydown', (e) => {
    // Ignore if focus is on an input element (let sliders work normally).
    if (e.target.tagName === 'INPUT') return;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        panel.classList.toggle('visible');
        // If we just showed it, schedule a hide; if hidden, clear the timeout.
        if (panel.classList.contains('visible')) {
          scheduleHide();
        } else {
          clearHideTimeout();
        }
        break;

      case ' ':
        e.preventDefault();
        randomizeParams();
        break;

      case 'r':
      case 'R':
        e.preventDefault();
        resetParams();
        break;

      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  });
}

// -------------------------------------------------------------------------
// Public init
// -------------------------------------------------------------------------

/**
 * Initialize the overlay UI. Call once after the renderer is running.
 */
export function initUI() {
  createPanel();
  setupEvents();
}
