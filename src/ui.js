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
  // Feedback group (mirrorMode, mirrorTarget, and feedbackBlendMode are handled by button selectors)
  feedbackRotation:   { label: 'Rotation',       min: -0.1,  max: 0.1,  step: 0.001,  group: 'Feedback' },
  feedbackZoom:       { label: 'Zoom',            min: 0.95,  max: 1.05, step: 0.001,  group: 'Feedback' },
  feedbackXShift:     { label: 'X Shift',         min: -0.05, max: 0.05, step: 0.001,  group: 'Feedback' },
  feedbackYShift:     { label: 'Y Shift',         min: -0.05, max: 0.05, step: 0.001,  group: 'Feedback' },
  feedbackDecay:      { label: 'Decay',           min: 0.8,   max: 1.0,  step: 0.005,  group: 'Feedback' },
  kaleidoscopeAngle:  { label: 'Kal Angle',       min: 0.0,   max: 6.283, step: 0.01,  group: 'Feedback' },

  // Shape group (shapeWaveform is handled by button selector)
  shapeFrequency:     { label: 'Frequency',       min: 0.5,   max: 20.0, step: 0.1,    group: 'Shape' },
  shapeAngle:         { label: 'Angle',           min: 0.0,   max: 6.283, step: 0.01,  group: 'Shape' },
  shapeThickness:     { label: 'Thickness',       min: 0.01,  max: 0.99, step: 0.01,   group: 'Shape' },
  shapeSoftness:      { label: 'Softness',        min: 0.0,   max: 0.1,  step: 0.005,  group: 'Shape' },
  shapePhaseOffset:   { label: 'Phase Offset',    min: 0.0,   max: 6.283, step: 0.01,  group: 'Shape' },
  shapeFractalAmount: { label: 'Fractal Amount',  min: 0,     max: 6,    step: 1,      group: 'Shape' },
  shapeFractalAngle:  { label: 'Fractal Angle',   min: 0.0,   max: 6.283, step: 0.01,  group: 'Shape' },

  // Movement group (movementMode is handled by button selector)
  movementSpeed:          { label: 'Speed',           min: 0.0,   max: 5.0,   step: 0.01,   group: 'Movement' },
  movementAmplitude:      { label: 'Amplitude',       min: 0.0,   max: 0.5,   step: 0.01,   group: 'Movement' },
  movementPhase:          { label: 'Phase',           min: 0.0,   max: 6.283, step: 0.01,   group: 'Movement' },
  movementSpiralSpeed:    { label: 'Spiral Speed',    min: 0.0,   max: 5.0,   step: 0.1,    group: 'Movement' },
  movementScrollAngle:    { label: 'Scroll Angle',    min: 0.0,   max: 6.283, step: 0.01,   group: 'Movement' },
  movementScrollSpeed:    { label: 'Scroll Speed',    min: 0.0,   max: 2.0,   step: 0.01,   group: 'Movement' },
  movementBounceSpeed:    { label: 'Bounce Speed',    min: 0.0,   max: 2.0,   step: 0.01,   group: 'Movement' },

  // Color group (colorMode is handled by button selector)
  hueRotationSpeed:     { label: 'Hue Speed',       min: 0.0,   max: 0.05, step: 0.0005, group: 'Color' },
  baseBrightness:       { label: 'Brightness',      min: 0.0,   max: 2.0,  step: 0.05,   group: 'Color' },
  saturation:           { label: 'Saturation',      min: 0.0,   max: 2.0,  step: 0.05,   group: 'Color' },
  shapeHue:             { label: 'Shape Hue',       min: 0.0,   max: 1.0,  step: 0.01,   group: 'Color' },
  shapeColorSat:        { label: 'Shape Color Sat', min: 0.0,   max: 1.0,  step: 0.01,   group: 'Color' },
  colorPosterizeLevels: { label: 'Posterize Levels',min: 2,     max: 16,   step: 1,      group: 'Color' },
  colorGradientHue1:    { label: 'Gradient Hue 1',  min: 0.0,   max: 1.0,  step: 0.01,   group: 'Color' },
  colorGradientHue2:    { label: 'Gradient Hue 2',  min: 0.0,   max: 1.0,  step: 0.01,   group: 'Color' },
  colorGradientHue3:    { label: 'Gradient Hue 3',  min: 0.0,   max: 1.0,  step: 0.01,   group: 'Color' },
};

// Waveform type names indexed by shapeWaveform value.
const WAVEFORM_NAMES = ['Sine', 'Tan', 'Square', 'Circle', 'Diamond', 'Triangle'];

// Color mode names indexed by colorMode value.
const COLOR_MODE_NAMES = ['Direct', 'Gradient', 'Posterize', 'Negative', 'Thermal'];

// Movement mode names indexed by movementMode value.
const MOVEMENT_MODE_NAMES = ['Sine', 'Lissajous', 'Spiral', 'Scroll', 'Bounce', 'Fixed'];

// Mirror mode names indexed by mirrorMode value.
const MIRROR_MODE_NAMES = ['Off', 'H Mirror', 'V Mirror', 'Quad', 'Kal 2', 'Kal 4', 'Kal 8'];

// Mirror target names indexed by mirrorTarget value.
const MIRROR_TARGET_NAMES = ['Feedback', 'Shape', 'Both', 'Output'];

// Feedback blend mode names indexed by feedbackBlendMode value.
const BLEND_MODE_NAMES = ['Multiply', 'Screen', 'Soft Burn', 'Freeze'];

// Group ordering
const GROUPS = ['Feedback', 'Shape', 'Movement', 'Color'];

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
  mirrorMode:         { min: 0,      max: 6     },   // integer, handled specially
  kaleidoscopeAngle:  { min: 0.0,    max: 6.283 },
  mirrorTarget:       { min: 0,      max: 3     },   // integer, handled specially
  feedbackBlendMode:  { min: 0,      max: 3     },   // integer, handled specially
  shapeWaveform:      { min: 0,      max: 5     },   // integer, handled specially
  shapeFrequency:     { min: 1.0,    max: 12.0  },
  shapeAngle:         { min: 0.0,    max: 6.283 },
  shapeThickness:     { min: 0.1,    max: 0.9   },
  shapeSoftness:      { min: 0.005,  max: 0.06  },
  shapePhaseOffset:   { min: 0.0,    max: 6.283 },
  shapeFractalAmount: { min: 0,      max: 6     },   // integer, handled specially
  shapeFractalAngle:  { min: 0.0,    max: 6.283 },
  movementMode:           { min: 0,      max: 5     },   // integer, handled specially
  movementAmplitude:      { min: 0.1,    max: 0.45  },
  movementPhase:          { min: 0.0,    max: 6.283 },
  movementSpeed:          { min: 0.1,    max: 3.0   },
  movementSpiralSpeed:    { min: 0.3,    max: 3.0   },
  movementScrollAngle:    { min: 0.0,    max: 6.283 },
  movementScrollSpeed:    { min: 0.1,    max: 1.0   },
  movementBounceSpeed:    { min: 0.1,    max: 1.0   },
  hueRotationSpeed:     { min: 0.002, max: 0.03  },
  baseBrightness:       { min: 0.7,    max: 1.4   },
  saturation:           { min: 0.6,    max: 1.6   },
  shapeHue:             { min: 0.0,    max: 1.0   },
  shapeColorSat:        { min: 0.3,    max: 1.0   },
  colorMode:            { min: 0,      max: 4     },   // integer, handled specially
  colorPosterizeLevels: { min: 2,      max: 12    },   // integer, handled specially
  colorGradientHue1:    { min: 0.0,    max: 1.0   },
  colorGradientHue2:    { min: 0.0,    max: 1.0   },
  colorGradientHue3:    { min: 0.0,    max: 1.0   },
};

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

let panel = null;
let hideTimeout = null;
let mouseOverPanel = false;
let sliderElements = {};  // key -> input element, for syncing on preset/reset
let waveformButtons = []; // waveform selector buttons, for syncing on preset/reset
let movementModeButtons = []; // movement mode selector buttons, for syncing on preset/reset
let colorModeButtons = []; // color mode selector buttons, for syncing on preset/reset
let mirrorModeButtons = []; // mirror mode selector buttons, for syncing on preset/reset
let mirrorTargetButtons = []; // mirror target selector buttons, for syncing on preset/reset
let blendModeButtons = []; // blend mode selector buttons, for syncing on preset/reset

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

    // Insert mirror mode, mirror target, and blend mode selectors at the top of the Feedback group.
    if (group === 'Feedback') {
      section.appendChild(createMirrorModeSelector());
      section.appendChild(createMirrorTargetSelector());
      section.appendChild(createBlendModeSelector());
    }

    // Insert waveform selector at the top of the Shape group.
    if (group === 'Shape') {
      section.appendChild(createWaveformSelector());
    }

    // Insert movement mode selector at the top of the Movement group.
    if (group === 'Movement') {
      section.appendChild(createMovementModeSelector());
    }

    // Insert color mode selector at the top of the Color group.
    if (group === 'Color') {
      section.appendChild(createColorModeSelector());
    }

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

// -------------------------------------------------------------------------
// Waveform selector factory
// -------------------------------------------------------------------------

function createWaveformSelector() {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  waveformButtons = [];

  for (let i = 0; i < WAVEFORM_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = WAVEFORM_NAMES[i];
    if (i === params.shapeWaveform) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.shapeWaveform = i;
      syncWaveformButtons();
    });

    waveformButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncWaveformButtons() {
  for (let i = 0; i < waveformButtons.length; i++) {
    waveformButtons[i].classList.toggle('active', i === params.shapeWaveform);
  }
}

// -------------------------------------------------------------------------
// Movement mode selector factory
// -------------------------------------------------------------------------

function createMovementModeSelector() {
  const row = document.createElement('div');
  row.className = 'movement-mode-row';

  movementModeButtons = [];

  for (let i = 0; i < MOVEMENT_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'movement-mode-btn';
    btn.textContent = MOVEMENT_MODE_NAMES[i];
    if (i === params.movementMode) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.movementMode = i;
      syncMovementModeButtons();
    });

    movementModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncMovementModeButtons() {
  for (let i = 0; i < movementModeButtons.length; i++) {
    movementModeButtons[i].classList.toggle('active', i === params.movementMode);
  }
}

// -------------------------------------------------------------------------
// Color mode selector factory
// -------------------------------------------------------------------------

function createColorModeSelector() {
  const row = document.createElement('div');
  row.className = 'color-mode-row';

  colorModeButtons = [];

  for (let i = 0; i < COLOR_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'color-mode-btn';
    btn.textContent = COLOR_MODE_NAMES[i];
    if (i === params.colorMode) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.colorMode = i;
      syncColorModeButtons();
    });

    colorModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncColorModeButtons() {
  for (let i = 0; i < colorModeButtons.length; i++) {
    colorModeButtons[i].classList.toggle('active', i === params.colorMode);
  }
}

// -------------------------------------------------------------------------
// Mirror mode selector factory
// -------------------------------------------------------------------------

function createMirrorModeSelector() {
  const row = document.createElement('div');
  row.className = 'mirror-mode-row';

  mirrorModeButtons = [];

  for (let i = 0; i < MIRROR_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'mirror-mode-btn';
    btn.textContent = MIRROR_MODE_NAMES[i];
    if (i === params.mirrorMode) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.mirrorMode = i;
      syncMirrorModeButtons();
    });

    mirrorModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncMirrorModeButtons() {
  for (let i = 0; i < mirrorModeButtons.length; i++) {
    mirrorModeButtons[i].classList.toggle('active', i === params.mirrorMode);
  }
}

// -------------------------------------------------------------------------
// Mirror target selector factory
// -------------------------------------------------------------------------

function createMirrorTargetSelector() {
  const row = document.createElement('div');
  row.className = 'mirror-target-row';

  mirrorTargetButtons = [];

  for (let i = 0; i < MIRROR_TARGET_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'mirror-mode-btn';  // reuse mirror-mode-btn styling
    btn.textContent = MIRROR_TARGET_NAMES[i];
    if (i === params.mirrorTarget) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.mirrorTarget = i;
      syncMirrorTargetButtons();
    });

    mirrorTargetButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncMirrorTargetButtons() {
  for (let i = 0; i < mirrorTargetButtons.length; i++) {
    mirrorTargetButtons[i].classList.toggle('active', i === params.mirrorTarget);
  }
}

// -------------------------------------------------------------------------
// Blend mode selector factory
// -------------------------------------------------------------------------

function createBlendModeSelector() {
  const row = document.createElement('div');
  row.className = 'blend-mode-row';

  blendModeButtons = [];

  for (let i = 0; i < BLEND_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'blend-mode-btn';
    btn.textContent = BLEND_MODE_NAMES[i];
    if (i === params.feedbackBlendMode) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.feedbackBlendMode = i;
      syncBlendModeButtons();
    });

    blendModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncBlendModeButtons() {
  for (let i = 0; i < blendModeButtons.length; i++) {
    blendModeButtons[i].classList.toggle('active', i === params.feedbackBlendMode);
  }
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
  syncWaveformButtons();
  syncMovementModeButtons();
  syncColorModeButtons();
  syncMirrorModeButtons();
  syncMirrorTargetButtons();
  syncBlendModeButtons();
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

    // Integer selectors -- not sliders, handle specially.
    if (key === 'shapeWaveform' || key === 'colorMode' || key === 'movementMode'
        || key === 'mirrorMode' || key === 'mirrorTarget' || key === 'feedbackBlendMode'
        || key === 'shapeFractalAmount') {
      params[key] = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
      continue;
    }
    if (key === 'colorPosterizeLevels') {
      params[key] = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
      continue;
    }

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
