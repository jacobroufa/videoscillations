/**
 * Overlay UI for the Hypnewcade video synthesizer.
 *
 * Creates a translucent control panel on the right side of the screen
 * that auto-hides after inactivity. All controls map directly to the
 * params object in params.js.
 *
 * The panel has two top-level tabs:
 *   1. Controls -- parameter sliders and action buttons
 *   2. Presets  -- Factory (read-only) and My Presets (user CRUD)
 *
 * Controls tab layout:
 *   - Action buttons (Randomize, Reset, Fullscreen)
 *   - Feedback section (always visible)
 *   - Color section (global, always visible)
 *   - Oscillators section with [Osc 1] [Osc 2] sub-tabs
 */

import { params, getDefaults } from './params.js';
import { loadBuiltInPresets } from './presets/index.js';
import {
  savePreset, loadAllPresets, deletePreset, renamePreset,
  getScreenshot, deleteScreenshot, updateScreenshot,
  exportPresets, importPresets,
} from './preset-store.js';
import { captureScreenshot, createThumbnail } from './screenshot.js';

// -------------------------------------------------------------------------
// Control definitions -- maps each param to its slider config.
// Grouped by oscillator prefix for the tabbed UI.
// -------------------------------------------------------------------------

// Feedback controls (always visible above oscillator tabs)
const FEEDBACK_DEFS = {
  feedbackRotation:   { label: 'Rotation',       min: -0.1,  max: 0.1,  step: 0.001  },
  feedbackZoom:       { label: 'Zoom',            min: 0.95,  max: 1.05, step: 0.001  },
  feedbackXShift:     { label: 'X Shift',         min: -0.05, max: 0.05, step: 0.001  },
  feedbackYShift:     { label: 'Y Shift',         min: -0.05, max: 0.05, step: 0.001  },
  feedbackDecay:      { label: 'Decay',           min: 0.8,   max: 1.0,  step: 0.005  },
  kaleidoscopeAngle:  { label: 'Kal Angle',       min: 0.0,   max: 6.283, step: 0.01  },
};

// Global color controls (always visible above oscillator tabs)
const GLOBAL_COLOR_DEFS = {
  hueRotationSpeed:     { label: 'Hue Speed',       min: 0.0,   max: 0.05, step: 0.0005 },
  baseBrightness:       { label: 'Brightness',      min: 0.0,   max: 2.0,  step: 0.05   },
  saturation:           { label: 'Saturation',      min: 0.0,   max: 2.0,  step: 0.05   },
  colorPosterizeLevels: { label: 'Posterize Levels',min: 2,     max: 16,   step: 1      },
  colorGradientHue1:    { label: 'Gradient Hue 1',  min: 0.0,   max: 1.0,  step: 0.01   },
  colorGradientHue2:    { label: 'Gradient Hue 2',  min: 0.0,   max: 1.0,  step: 0.01   },
  colorGradientHue3:    { label: 'Gradient Hue 3',  min: 0.0,   max: 1.0,  step: 0.01   },
};

/**
 * Per-oscillator slider definitions. Uses a suffix that gets prefixed
 * with 'osc1' or 'osc2' at build time.
 */
const OSC_SLIDER_DEFS = {
  Frequency:          { label: 'Frequency',       min: 0.5,   max: 20.0, step: 0.1    },
  Angle:              { label: 'Angle',           min: 0.0,   max: 6.283, step: 0.01  },
  Thickness:          { label: 'Thickness',       min: 0.01,  max: 0.99, step: 0.01   },
  Softness:           { label: 'Softness',        min: 0.0,   max: 0.1,  step: 0.005  },
  PhaseOffset:        { label: 'Phase Offset',    min: 0.0,   max: 6.283, step: 0.01  },
  PolarizationAngle:  { label: 'Polarization',    min: 0.0,   max: 6.283, step: 0.01  },
  PolarizationSpeed:  { label: 'Polar Speed',     min: -2.0,  max: 2.0,  step: 0.01   },
  FractalAmount:      { label: 'Fractal Amount',  min: 0,     max: 6,    step: 1      },
  FractalAngle:       { label: 'Fractal Angle',   min: 0.0,   max: 6.283, step: 0.01  },
  Hue:                { label: 'Hue',             min: 0.0,   max: 1.0,  step: 0.01   },
  ColorSat:           { label: 'Color Sat',       min: 0.0,   max: 1.0,  step: 0.01   },
};

/** Per-oscillator angle LFO slider definitions (suffix only). */
const OSC_ANGLE_LFO_DEFS = {
  AngleLFORate:  { label: 'LFO Rate',  min: 0.01,  max: 5.0,     step: 0.01 },
  AngleLFODepth: { label: 'LFO Depth', min: 0.0,   max: 3.14159, step: 0.01 },
};

/** Per-oscillator movement slider definitions (suffix only). */
const OSC_MOVEMENT_DEFS = {
  MovementSpeed:          { label: 'Speed',           min: 0.0,   max: 5.0,   step: 0.01 },
  MovementAmplitude:      { label: 'Amplitude',       min: 0.0,   max: 0.5,   step: 0.01 },
  MovementPhase:          { label: 'Phase',           min: 0.0,   max: 6.283, step: 0.01 },
  MovementLissajousRatio: { label: 'Lissajous Ratio', min: 0.1,   max: 3.0,   step: 0.01 },
  MovementSpiralSpeed:    { label: 'Spiral Speed',    min: 0.0,   max: 5.0,   step: 0.1  },
  MovementScrollAngle:    { label: 'Scroll Angle',    min: 0.0,   max: 6.283, step: 0.01 },
  MovementScrollSpeed:    { label: 'Scroll Speed',    min: 0.0,   max: 2.0,   step: 0.01 },
  MovementBounceSpeed:    { label: 'Bounce Speed',    min: 0.0,   max: 2.0,   step: 0.01 },
};

// Waveform type names indexed by waveform value.
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

// Osc blend mode names.
const OSC_BLEND_MODE_NAMES = ['Add', 'Multiply', 'Mask', 'Difference', 'Phase Mod'];

// Angle LFO waveform names.
const ANGLE_LFO_WAVEFORM_NAMES = ['Sine', 'Triangle', 'Saw', 'Square', 'S&H'];

// -------------------------------------------------------------------------
// Weighted random ranges for "randomize with taste".
// -------------------------------------------------------------------------

const RANDOM_RANGES = {
  feedbackRotation:   { min: -0.04,  max: 0.04  },
  feedbackZoom:       { min: 0.995,  max: 1.015 },
  feedbackXShift:     { min: -0.005, max: 0.005 },
  feedbackYShift:     { min: -0.005, max: 0.005 },
  feedbackDecay:      { min: 0.91,   max: 0.99  },
  mirrorMode:         { min: 0,      max: 6     },
  kaleidoscopeAngle:  { min: 0.0,    max: 6.283 },
  mirrorTarget:       { min: 0,      max: 3     },
  feedbackBlendMode:  { min: 0,      max: 3     },

  // Osc1
  osc1Waveform:               { min: 0,      max: 5     },
  osc1Frequency:              { min: 1.0,    max: 12.0  },
  osc1Angle:                  { min: 0.0,    max: 6.283 },
  osc1Thickness:              { min: 0.1,    max: 0.9   },
  osc1Softness:               { min: 0.005,  max: 0.06  },
  osc1PhaseOffset:            { min: 0.0,    max: 6.283 },
  osc1PolarizationAngle:      { min: 0.0,    max: 6.283 },
  osc1PolarizationSpeed:      { min: -0.5,   max: 0.5   },
  osc1AngleLFOEnabled:        { min: 0,      max: 1     },
  osc1AngleLFOWaveform:       { min: 0,      max: 4     },
  osc1AngleLFORate:           { min: 0.05,   max: 2.0   },
  osc1AngleLFODepth:          { min: 0.0,    max: 1.57  },
  osc1FractalAmount:          { min: 0,      max: 6     },
  osc1FractalAngle:           { min: 0.0,    max: 6.283 },
  osc1Hue:                    { min: 0.0,    max: 1.0   },
  osc1ColorSat:               { min: 0.3,    max: 1.0   },
  osc1MovementMode:           { min: 0,      max: 5     },
  osc1MovementAmplitude:      { min: 0.1,    max: 0.45  },
  osc1MovementPhase:          { min: 0.0,    max: 6.283 },
  osc1MovementLissajousRatio: { min: 0.1,    max: 2.5   },
  osc1MovementSpeed:          { min: 0.1,    max: 3.0   },
  osc1MovementSpiralSpeed:    { min: 0.3,    max: 3.0   },
  osc1MovementScrollAngle:    { min: 0.0,    max: 6.283 },
  osc1MovementScrollSpeed:    { min: 0.1,    max: 1.0   },
  osc1MovementBounceSpeed:    { min: 0.1,    max: 1.0   },

  // Osc2
  osc2Enabled:                { min: 0,      max: 1     },
  osc2Waveform:               { min: 0,      max: 5     },
  osc2Frequency:              { min: 1.0,    max: 12.0  },
  osc2Angle:                  { min: 0.0,    max: 6.283 },
  osc2Thickness:              { min: 0.1,    max: 0.9   },
  osc2Softness:               { min: 0.005,  max: 0.06  },
  osc2PhaseOffset:            { min: 0.0,    max: 6.283 },
  osc2PolarizationAngle:      { min: 0.0,    max: 6.283 },
  osc2PolarizationSpeed:      { min: -0.5,   max: 0.5   },
  osc2AngleLFOEnabled:        { min: 0,      max: 1     },
  osc2AngleLFOWaveform:       { min: 0,      max: 4     },
  osc2AngleLFORate:           { min: 0.05,   max: 2.0   },
  osc2AngleLFODepth:          { min: 0.0,    max: 1.57  },
  osc2Hue:                    { min: 0.0,    max: 1.0   },
  osc2ColorSat:               { min: 0.3,    max: 1.0   },
  osc2BlendMode:              { min: 0,      max: 4     },
  osc2FractalAmount:          { min: 0,      max: 6     },
  osc2FractalAngle:           { min: 0.0,    max: 6.283 },
  osc2MovementMode:           { min: 0,      max: 5     },
  osc2MovementSpeed:          { min: 0.1,    max: 3.0   },
  osc2MovementAmplitude:      { min: 0.1,    max: 0.45  },
  osc2MovementPhase:          { min: 0.0,    max: 6.283 },
  osc2MovementLissajousRatio: { min: 0.1,    max: 2.5   },
  osc2MovementSpiralSpeed:    { min: 0.3,    max: 3.0   },
  osc2MovementScrollAngle:    { min: 0.0,    max: 6.283 },
  osc2MovementScrollSpeed:    { min: 0.1,    max: 1.0   },
  osc2MovementBounceSpeed:    { min: 0.1,    max: 1.0   },

  // Global color
  hueRotationSpeed:     { min: 0.002, max: 0.03  },
  baseBrightness:       { min: 0.7,    max: 1.4   },
  saturation:           { min: 0.6,    max: 1.6   },
  colorMode:            { min: 0,      max: 4     },
  colorPosterizeLevels: { min: 2,      max: 12    },
  colorGradientHue1:    { min: 0.0,    max: 1.0   },
  colorGradientHue2:    { min: 0.0,    max: 1.0   },
  colorGradientHue3:    { min: 0.0,    max: 1.0   },
};

// Integer param keys for randomization (use floor instead of snap).
const INTEGER_RANDOM_KEYS = new Set([
  'mirrorMode', 'mirrorTarget', 'feedbackBlendMode', 'colorMode', 'colorPosterizeLevels',
  'osc1Waveform', 'osc1FractalAmount', 'osc1AngleLFOEnabled', 'osc1AngleLFOWaveform', 'osc1MovementMode',
  'osc2Enabled', 'osc2Waveform', 'osc2BlendMode', 'osc2FractalAmount',
  'osc2AngleLFOEnabled', 'osc2AngleLFOWaveform', 'osc2MovementMode',
]);

// -------------------------------------------------------------------------
// State
// -------------------------------------------------------------------------

let panel = null;
let hideTimeout = null;
let mouseOverPanel = false;
let sliderElements = {};  // key -> { input, valueEl, def }, for syncing on preset/reset

// Per-oscillator button state
const oscState = {
  osc1: { waveformButtons: [], blendModeButtons: [], movementModeButtons: [],
           angleLFOToggleBtn: null, angleLFOWaveformButtons: [],
           enableBtn: null, controlsContainer: null, angleLFOControlsContainer: null },
  osc2: { waveformButtons: [], blendModeButtons: [], movementModeButtons: [],
           angleLFOToggleBtn: null, angleLFOWaveformButtons: [],
           enableBtn: null, controlsContainer: null, angleLFOControlsContainer: null },
};

// Global button state
let colorModeButtons = [];
let mirrorModeButtons = [];
let mirrorTargetButtons = [];
let blendModeButtons = [];

// Active oscillator tab
let activeOscTab = 'osc1';

// Renderer reference for screenshot capture.
let _renderer = null;

// Preset data caches.
let _builtInPresets = [];
let _userPresets = [];

// DOM references for preset tabs.
let _factoryGrid = null;
let _userGrid = null;

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

  // -- Top-level tab bar --------------------------------------------------
  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';

  const controlsTabBtn = document.createElement('button');
  controlsTabBtn.className = 'tab-btn active';
  controlsTabBtn.textContent = 'Controls';

  const presetsTabBtn = document.createElement('button');
  presetsTabBtn.className = 'tab-btn';
  presetsTabBtn.textContent = 'Presets';

  tabBar.appendChild(controlsTabBtn);
  tabBar.appendChild(presetsTabBtn);
  panel.appendChild(tabBar);

  // -- Controls tab content -----------------------------------------------
  const controlsTab = document.createElement('div');
  controlsTab.className = 'tab-content active';
  controlsTab.id = 'controls-tab';

  buildControlsContent(controlsTab);
  panel.appendChild(controlsTab);

  // -- Presets tab content ------------------------------------------------
  const presetsTab = document.createElement('div');
  presetsTab.className = 'tab-content';
  presetsTab.id = 'presets-tab';

  buildPresetsContent(presetsTab);
  panel.appendChild(presetsTab);

  // -- Tab switching logic ------------------------------------------------
  controlsTabBtn.addEventListener('click', () => {
    controlsTabBtn.classList.add('active');
    presetsTabBtn.classList.remove('active');
    controlsTab.classList.add('active');
    presetsTab.classList.remove('active');
  });

  presetsTabBtn.addEventListener('click', () => {
    presetsTabBtn.classList.add('active');
    controlsTabBtn.classList.remove('active');
    presetsTab.classList.add('active');
    controlsTab.classList.remove('active');
  });

  document.body.appendChild(panel);
}

// -------------------------------------------------------------------------
// Controls tab builder
// -------------------------------------------------------------------------

function buildControlsContent(container) {
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
  container.appendChild(actionsSection);

  // -- Feedback section ---------------------------------------------------
  const feedbackSection = document.createElement('div');
  feedbackSection.className = 'panel-section';

  const feedbackHeading = document.createElement('h3');
  feedbackHeading.className = 'section-label';
  feedbackHeading.textContent = 'Feedback';
  feedbackSection.appendChild(feedbackHeading);

  feedbackSection.appendChild(createMirrorModeSelector());
  feedbackSection.appendChild(createMirrorTargetSelector());
  feedbackSection.appendChild(createBlendModeSelector());

  for (const [key, def] of Object.entries(FEEDBACK_DEFS)) {
    feedbackSection.appendChild(createSlider(key, def));
  }

  container.appendChild(feedbackSection);

  // -- Color section (global) ---------------------------------------------
  const colorSection = document.createElement('div');
  colorSection.className = 'panel-section';

  const colorHeading = document.createElement('h3');
  colorHeading.className = 'section-label';
  colorHeading.textContent = 'Color';
  colorSection.appendChild(colorHeading);

  colorSection.appendChild(createColorModeSelector());

  for (const [key, def] of Object.entries(GLOBAL_COLOR_DEFS)) {
    colorSection.appendChild(createSlider(key, def));
  }

  container.appendChild(colorSection);

  // -- Oscillators section ------------------------------------------------
  const oscSection = document.createElement('div');
  oscSection.className = 'panel-section';

  const oscHeading = document.createElement('h3');
  oscHeading.className = 'section-label';
  oscHeading.textContent = 'Oscillators';
  oscSection.appendChild(oscHeading);

  // Osc sub-tab bar
  const oscTabBar = document.createElement('div');
  oscTabBar.className = 'sub-tab-bar';

  const osc1TabBtn = document.createElement('button');
  osc1TabBtn.className = 'sub-tab-btn active';
  osc1TabBtn.textContent = 'Osc 1';

  const osc2TabBtn = document.createElement('button');
  osc2TabBtn.className = 'sub-tab-btn';
  osc2TabBtn.textContent = 'Osc 2';

  oscTabBar.appendChild(osc1TabBtn);
  oscTabBar.appendChild(osc2TabBtn);
  oscSection.appendChild(oscTabBar);

  // Osc1 tab content
  const osc1Content = document.createElement('div');
  osc1Content.className = 'sub-tab-content active';
  buildOscillatorTab(osc1Content, 'osc1');
  oscSection.appendChild(osc1Content);

  // Osc2 tab content
  const osc2Content = document.createElement('div');
  osc2Content.className = 'sub-tab-content';
  buildOscillatorTab(osc2Content, 'osc2');
  oscSection.appendChild(osc2Content);

  // Osc sub-tab switching
  osc1TabBtn.addEventListener('click', () => {
    osc1TabBtn.classList.add('active');
    osc2TabBtn.classList.remove('active');
    osc1Content.classList.add('active');
    osc2Content.classList.remove('active');
    activeOscTab = 'osc1';
  });

  osc2TabBtn.addEventListener('click', () => {
    osc2TabBtn.classList.add('active');
    osc1TabBtn.classList.remove('active');
    osc2Content.classList.add('active');
    osc1Content.classList.remove('active');
    activeOscTab = 'osc2';
  });

  container.appendChild(oscSection);

  // -- Keyboard hint at the bottom ----------------------------------------
  const hint = document.createElement('div');
  hint.className = 'keyboard-hint';
  hint.innerHTML = '<kbd>Tab</kbd> toggle UI &nbsp; <kbd>Space</kbd> randomize &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>F</kbd> fullscreen &nbsp; <kbd>S</kbd> save preset';
  container.appendChild(hint);
}

// -------------------------------------------------------------------------
// Build oscillator tab content (identical structure for osc1 and osc2)
// -------------------------------------------------------------------------

function buildOscillatorTab(container, prefix) {
  const state = oscState[prefix];

  // Enable toggle
  container.appendChild(createOscEnableToggle(prefix));

  // Collapsible container for all osc controls
  state.controlsContainer = document.createElement('div');
  state.controlsContainer.className = 'collapsible-section';
  if (!params[prefix + 'Enabled']) state.controlsContainer.classList.add('collapsed');

  // Blend mode selector
  state.controlsContainer.appendChild(createOscBlendModeSelector(prefix));

  // Waveform selector
  state.controlsContainer.appendChild(createOscWaveformSelector(prefix));

  // Shape sliders
  for (const [suffix, def] of Object.entries(OSC_SLIDER_DEFS)) {
    const key = prefix + suffix;
    state.controlsContainer.appendChild(createSlider(key, def));
  }

  // Angle LFO sub-section
  state.controlsContainer.appendChild(createOscAngleLFOSection(prefix));

  // Movement sub-section
  const movementLabel = document.createElement('div');
  movementLabel.className = 'subsection-label';
  movementLabel.textContent = 'Movement';
  state.controlsContainer.appendChild(movementLabel);

  state.controlsContainer.appendChild(createOscMovementModeSelector(prefix));

  for (const [suffix, def] of Object.entries(OSC_MOVEMENT_DEFS)) {
    const key = prefix + suffix;
    state.controlsContainer.appendChild(createSlider(key, def));
  }

  container.appendChild(state.controlsContainer);
}

// -------------------------------------------------------------------------
// Oscillator enable toggle
// -------------------------------------------------------------------------

function createOscEnableToggle(prefix) {
  const state = oscState[prefix];
  const enableKey = prefix + 'Enabled';

  state.enableBtn = document.createElement('button');
  state.enableBtn.className = 'subsection-toggle-btn';
  state.enableBtn.textContent = params[enableKey] ? 'Enabled' : 'Disabled';
  if (params[enableKey]) state.enableBtn.classList.add('active');

  state.enableBtn.addEventListener('click', () => {
    params[enableKey] = params[enableKey] ? 0 : 1;
    syncOscEnableToggle(prefix);
    updateControlVisibility();
  });

  return state.enableBtn;
}

function syncOscEnableToggle(prefix) {
  const state = oscState[prefix];
  const enableKey = prefix + 'Enabled';
  if (state.enableBtn) {
    state.enableBtn.textContent = params[enableKey] ? 'Enabled' : 'Disabled';
    state.enableBtn.classList.toggle('active', !!params[enableKey]);
  }
  if (state.controlsContainer) {
    state.controlsContainer.classList.toggle('collapsed', !params[enableKey]);
  }
}

// -------------------------------------------------------------------------
// Oscillator blend mode selector
// -------------------------------------------------------------------------

function createOscBlendModeSelector(prefix) {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  const state = oscState[prefix];
  state.blendModeButtons = [];
  const key = prefix + 'BlendMode';

  for (let i = 0; i < OSC_BLEND_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = OSC_BLEND_MODE_NAMES[i];
    if (i === params[key]) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params[key] = i;
      syncOscBlendModeButtons(prefix);
    });

    state.blendModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOscBlendModeButtons(prefix) {
  const state = oscState[prefix];
  const key = prefix + 'BlendMode';
  for (let i = 0; i < state.blendModeButtons.length; i++) {
    state.blendModeButtons[i].classList.toggle('active', i === params[key]);
  }
}

// -------------------------------------------------------------------------
// Oscillator waveform selector
// -------------------------------------------------------------------------

function createOscWaveformSelector(prefix) {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  const state = oscState[prefix];
  state.waveformButtons = [];
  const key = prefix + 'Waveform';

  for (let i = 0; i < WAVEFORM_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = WAVEFORM_NAMES[i];
    if (i === params[key]) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params[key] = i;
      syncOscWaveformButtons(prefix);
    });

    state.waveformButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOscWaveformButtons(prefix) {
  const state = oscState[prefix];
  const key = prefix + 'Waveform';
  for (let i = 0; i < state.waveformButtons.length; i++) {
    state.waveformButtons[i].classList.toggle('active', i === params[key]);
  }
}

// -------------------------------------------------------------------------
// Oscillator angle LFO section
// -------------------------------------------------------------------------

function createOscAngleLFOSection(prefix) {
  const state = oscState[prefix];
  const wrapper = document.createElement('div');
  wrapper.className = 'subsection';

  const enableKey = prefix + 'AngleLFOEnabled';

  // Toggle button
  state.angleLFOToggleBtn = document.createElement('button');
  state.angleLFOToggleBtn.className = 'subsection-toggle-btn';
  state.angleLFOToggleBtn.textContent = params[enableKey] ? 'Angle LFO: ON' : 'Angle LFO: OFF';
  if (params[enableKey]) state.angleLFOToggleBtn.classList.add('active');

  state.angleLFOToggleBtn.addEventListener('click', () => {
    params[enableKey] = params[enableKey] ? 0 : 1;
    syncOscAngleLFOToggle(prefix);
    updateControlVisibility();
  });

  wrapper.appendChild(state.angleLFOToggleBtn);

  // Collapsible container for LFO controls
  state.angleLFOControlsContainer = document.createElement('div');
  state.angleLFOControlsContainer.className = 'collapsible-section';
  if (!params[enableKey]) state.angleLFOControlsContainer.classList.add('collapsed');

  // LFO waveform selector
  state.angleLFOControlsContainer.appendChild(createOscAngleLFOWaveformSelector(prefix));

  // LFO sliders
  for (const [suffix, def] of Object.entries(OSC_ANGLE_LFO_DEFS)) {
    const key = prefix + suffix;
    state.angleLFOControlsContainer.appendChild(createSlider(key, def));
  }

  wrapper.appendChild(state.angleLFOControlsContainer);
  return wrapper;
}

function syncOscAngleLFOToggle(prefix) {
  const state = oscState[prefix];
  const enableKey = prefix + 'AngleLFOEnabled';
  if (state.angleLFOToggleBtn) {
    state.angleLFOToggleBtn.textContent = params[enableKey] ? 'Angle LFO: ON' : 'Angle LFO: OFF';
    state.angleLFOToggleBtn.classList.toggle('active', !!params[enableKey]);
  }
  if (state.angleLFOControlsContainer) {
    state.angleLFOControlsContainer.classList.toggle('collapsed', !params[enableKey]);
  }
}

// -------------------------------------------------------------------------
// Oscillator angle LFO waveform selector
// -------------------------------------------------------------------------

function createOscAngleLFOWaveformSelector(prefix) {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  const state = oscState[prefix];
  state.angleLFOWaveformButtons = [];
  const key = prefix + 'AngleLFOWaveform';

  for (let i = 0; i < ANGLE_LFO_WAVEFORM_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = ANGLE_LFO_WAVEFORM_NAMES[i];
    if (i === params[key]) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params[key] = i;
      syncOscAngleLFOWaveformButtons(prefix);
    });

    state.angleLFOWaveformButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOscAngleLFOWaveformButtons(prefix) {
  const state = oscState[prefix];
  const key = prefix + 'AngleLFOWaveform';
  for (let i = 0; i < state.angleLFOWaveformButtons.length; i++) {
    state.angleLFOWaveformButtons[i].classList.toggle('active', i === params[key]);
  }
}

// -------------------------------------------------------------------------
// Oscillator movement mode selector
// -------------------------------------------------------------------------

function createOscMovementModeSelector(prefix) {
  const row = document.createElement('div');
  row.className = 'movement-mode-row';

  const state = oscState[prefix];
  state.movementModeButtons = [];
  const key = prefix + 'MovementMode';

  for (let i = 0; i < MOVEMENT_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'movement-mode-btn';
    btn.textContent = MOVEMENT_MODE_NAMES[i];
    if (i === params[key]) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params[key] = i;
      syncOscMovementModeButtons(prefix);
      updateControlVisibility();
    });

    state.movementModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOscMovementModeButtons(prefix) {
  const state = oscState[prefix];
  const key = prefix + 'MovementMode';
  for (let i = 0; i < state.movementModeButtons.length; i++) {
    state.movementModeButtons[i].classList.toggle('active', i === params[key]);
  }
}

// -------------------------------------------------------------------------
// Presets tab builder
// -------------------------------------------------------------------------

function buildPresetsContent(container) {
  // -- Sub-tab bar --------------------------------------------------------
  const subTabBar = document.createElement('div');
  subTabBar.className = 'sub-tab-bar';

  const factoryTabBtn = document.createElement('button');
  factoryTabBtn.className = 'sub-tab-btn active';
  factoryTabBtn.textContent = 'Factory';

  const myPresetsTabBtn = document.createElement('button');
  myPresetsTabBtn.className = 'sub-tab-btn';
  myPresetsTabBtn.textContent = 'My Presets';

  subTabBar.appendChild(factoryTabBtn);
  subTabBar.appendChild(myPresetsTabBtn);
  container.appendChild(subTabBar);

  // -- Factory sub-tab content --------------------------------------------
  const factoryContent = document.createElement('div');
  factoryContent.className = 'sub-tab-content active';

  _factoryGrid = document.createElement('div');
  _factoryGrid.className = 'preset-grid';
  factoryContent.appendChild(_factoryGrid);
  container.appendChild(factoryContent);

  // -- My Presets sub-tab content -----------------------------------------
  const myPresetsContent = document.createElement('div');
  myPresetsContent.className = 'sub-tab-content';

  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Save Current (S)';
  saveBtn.addEventListener('click', handleSavePreset);
  myPresetsContent.appendChild(saveBtn);

  // Info notice
  const notice = createInfoNotice();
  myPresetsContent.appendChild(notice);

  // Import / Export row
  const ioRow = document.createElement('div');
  ioRow.className = 'import-export-row';

  const importBtn = document.createElement('button');
  importBtn.className = 'import-btn';
  importBtn.textContent = 'Import';
  importBtn.addEventListener('click', handleImport);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'export-btn';
  exportBtn.textContent = 'Export';
  exportBtn.addEventListener('click', handleExport);

  ioRow.appendChild(importBtn);
  ioRow.appendChild(exportBtn);
  myPresetsContent.appendChild(ioRow);

  _userGrid = document.createElement('div');
  _userGrid.className = 'preset-grid';
  myPresetsContent.appendChild(_userGrid);

  container.appendChild(myPresetsContent);

  // -- Sub-tab switching --------------------------------------------------
  factoryTabBtn.addEventListener('click', () => {
    factoryTabBtn.classList.add('active');
    myPresetsTabBtn.classList.remove('active');
    factoryContent.classList.add('active');
    myPresetsContent.classList.remove('active');
  });

  myPresetsTabBtn.addEventListener('click', () => {
    myPresetsTabBtn.classList.add('active');
    factoryTabBtn.classList.remove('active');
    myPresetsContent.classList.add('active');
    factoryContent.classList.remove('active');
  });
}

// -------------------------------------------------------------------------
// Info notice
// -------------------------------------------------------------------------

function createInfoNotice() {
  const notice = document.createElement('div');
  notice.className = 'info-notice';

  const collapsed = localStorage.getItem('hypnewcade-notice-collapsed') === 'true';
  if (collapsed) notice.classList.add('collapsed');

  const header = document.createElement('div');
  header.className = 'notice-header';

  const label = document.createElement('span');
  label.textContent = 'Info';

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'notice-dismiss';
  dismissBtn.textContent = collapsed ? '+' : '-';

  header.appendChild(label);
  header.appendChild(dismissBtn);

  const body = document.createElement('div');
  body.className = 'notice-body';
  body.textContent = 'Your presets are saved in this browser. Use Export to back them up or transfer to another device.';

  header.addEventListener('click', () => {
    const isCollapsed = notice.classList.toggle('collapsed');
    dismissBtn.textContent = isCollapsed ? '+' : '-';
    localStorage.setItem('hypnewcade-notice-collapsed', isCollapsed);
  });

  notice.appendChild(header);
  notice.appendChild(body);

  return notice;
}

// -------------------------------------------------------------------------
// Preset card creation
// -------------------------------------------------------------------------

function createPresetCard(preset, thumbnailURL, isBuiltIn) {
  const card = document.createElement('div');
  card.className = 'preset-card' + (isBuiltIn ? ' read-only' : '');
  card.dataset.presetId = preset.id;

  // Thumbnail area
  if (thumbnailURL) {
    const img = document.createElement('img');
    img.className = 'thumbnail';
    img.src = thumbnailURL;
    img.alt = preset.name;
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-thumb';
    placeholder.textContent = '~';
    card.appendChild(placeholder);
  }

  // Name
  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = preset.name;
  card.appendChild(nameEl);

  // Click to load preset
  card.addEventListener('click', (e) => {
    if (e.target.closest('.hover-actions') || e.target.closest('.screenshot-actions') ||
        e.target.closest('.confirm-delete') || e.target.closest('.inline-edit')) {
      return;
    }
    applyPresetData(preset.params);
  });

  // Hover actions (only for user presets)
  if (!isBuiltIn) {
    const hoverActions = document.createElement('div');
    hoverActions.className = 'hover-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'action-icon';
    renameBtn.title = 'Rename';
    renameBtn.textContent = '\u270E';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineRename(card, preset);
    });

    const cameraBtn = document.createElement('button');
    cameraBtn.className = 'action-icon';
    cameraBtn.title = 'Re-capture screenshot';
    cameraBtn.textContent = '\u25CE';
    cameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRecapture(card, preset);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-icon danger';
    deleteBtn.title = 'Delete preset';
    deleteBtn.textContent = '\u2715';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirm(card, preset);
    });

    hoverActions.appendChild(renameBtn);
    hoverActions.appendChild(cameraBtn);
    hoverActions.appendChild(deleteBtn);
    card.appendChild(hoverActions);

    if (thumbnailURL) {
      const screenshotActions = document.createElement('div');
      screenshotActions.className = 'screenshot-actions';

      const removeScreenBtn = document.createElement('button');
      removeScreenBtn.className = 'action-icon danger';
      removeScreenBtn.title = 'Remove screenshot';
      removeScreenBtn.textContent = '\u2715';
      removeScreenBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteScreenshot(card, preset);
      });

      screenshotActions.appendChild(removeScreenBtn);
      card.appendChild(screenshotActions);
    }
  }

  return card;
}

// -------------------------------------------------------------------------
// Inline rename
// -------------------------------------------------------------------------

function startInlineRename(card, preset) {
  const nameEl = card.querySelector('.card-name');
  if (!nameEl) return;

  const input = document.createElement('input');
  input.className = 'inline-edit';
  input.type = 'text';
  input.value = preset.name;

  nameEl.style.display = 'none';
  card.appendChild(input);
  input.focus();
  input.select();

  const finish = async () => {
    const newName = input.value.trim();
    if (newName && newName !== preset.name) {
      await renamePreset(preset.id, newName);
      preset.name = newName;
      nameEl.textContent = newName;
    }
    nameEl.style.display = '';
    if (input.parentNode) input.remove();
  };

  input.addEventListener('blur', finish);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    }
    if (e.key === 'Escape') {
      input.value = preset.name;
      input.blur();
    }
  });
}

// -------------------------------------------------------------------------
// Delete confirmation
// -------------------------------------------------------------------------

function showDeleteConfirm(card, preset) {
  const existing = card.querySelector('.confirm-delete');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'confirm-delete';

  const msg = document.createElement('span');
  msg.textContent = 'Delete?';

  const btns = document.createElement('div');
  btns.className = 'confirm-btns';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'confirm-yes';
  yesBtn.textContent = 'Yes';
  yesBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await deletePreset(preset.id);
    card.remove();
    _userPresets = _userPresets.filter(p => p.id !== preset.id);
  });

  const noBtn = document.createElement('button');
  noBtn.className = 'confirm-no';
  noBtn.textContent = 'No';
  noBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
  });

  btns.appendChild(yesBtn);
  btns.appendChild(noBtn);
  overlay.appendChild(msg);
  overlay.appendChild(btns);
  card.appendChild(overlay);
}

// -------------------------------------------------------------------------
// Screenshot operations on cards
// -------------------------------------------------------------------------

async function handleDeleteScreenshot(card, preset) {
  await deleteScreenshot(preset.id);
  refreshUserPresetCard(card, preset, null);
}

async function handleRecapture(card, preset) {
  if (!_renderer) return;
  _renderer.requestScreenshot(async (canvas) => {
    try {
      const blob = await captureScreenshot(canvas);
      const thumb = await createThumbnail(blob);
      await updateScreenshot(preset.id, thumb);
      const url = URL.createObjectURL(thumb);
      refreshUserPresetCard(card, preset, url);
    } catch (err) {
      console.warn('Failed to recapture screenshot:', err);
    }
  });
}

function refreshUserPresetCard(oldCard, preset, thumbnailURL) {
  const newCard = createPresetCard(preset, thumbnailURL, false);
  if (oldCard.parentNode) {
    oldCard.parentNode.replaceChild(newCard, oldCard);
  }
}

// -------------------------------------------------------------------------
// Save preset flow
// -------------------------------------------------------------------------

async function handleSavePreset() {
  if (!_renderer) {
    console.warn('Renderer not available for screenshot capture');
    return;
  }

  _renderer.requestScreenshot(async (canvas) => {
    try {
      const blob = await captureScreenshot(canvas);
      const thumb = await createThumbnail(blob);

      const presetData = {
        name: 'Preset ' + new Date().toLocaleTimeString(),
        description: '',
        params: { ...params },
      };

      const id = await savePreset(presetData, thumb);
      presetData.id = id;
      presetData.builtIn = false;
      presetData.createdAt = new Date().toISOString();

      _userPresets.push(presetData);

      const url = URL.createObjectURL(thumb);
      const card = createPresetCard(presetData, url, false);
      _userGrid.appendChild(card);

      const empty = _userGrid.parentNode.querySelector('.empty-state');
      if (empty) empty.remove();
    } catch (err) {
      console.warn('Failed to save preset:', err);
    }
  });
}

// -------------------------------------------------------------------------
// Import / Export handlers
// -------------------------------------------------------------------------

async function handleExport() {
  try {
    await exportPresets();
  } catch (err) {
    console.warn('Failed to export presets:', err);
  }
}

async function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const count = await importPresets(file);
      console.log(`Imported ${count} presets.`);
      await refreshUserPresetsGrid();
    } catch (err) {
      console.warn('Failed to import presets:', err);
    }
  });

  input.click();
}

// -------------------------------------------------------------------------
// Grid population
// -------------------------------------------------------------------------

async function populateFactoryPresets() {
  _builtInPresets = await loadBuiltInPresets();

  _factoryGrid.innerHTML = '';
  for (const preset of _builtInPresets) {
    const card = createPresetCard(preset, null, true);
    _factoryGrid.appendChild(card);
  }
}

async function populateUserPresets() {
  _userPresets = await loadAllPresets();
  await renderUserPresetsGrid();
}

async function refreshUserPresetsGrid() {
  _userPresets = await loadAllPresets();
  await renderUserPresetsGrid();
}

async function renderUserPresetsGrid() {
  _userGrid.innerHTML = '';

  if (_userPresets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No saved presets yet. Use "Save Current" or press S to capture the current state.';
    _userGrid.parentNode.insertBefore(empty, _userGrid);
    return;
  }

  const existingEmpty = _userGrid.parentNode.querySelector('.empty-state');
  if (existingEmpty) existingEmpty.remove();

  for (const preset of _userPresets) {
    let thumbnailURL = null;
    try {
      const blob = await getScreenshot(preset.id);
      if (blob) {
        thumbnailURL = URL.createObjectURL(blob);
      }
    } catch (e) {
      // No screenshot available
    }
    const card = createPresetCard(preset, thumbnailURL, false);
    _userGrid.appendChild(card);
  }
}

// -------------------------------------------------------------------------
// Slider control factory
// -------------------------------------------------------------------------

function createSlider(key, def) {
  const row = document.createElement('div');
  row.className = 'slider-row';
  row.dataset.param = key;

  const labelEl = document.createElement('label');
  labelEl.className = 'slider-label';
  labelEl.textContent = def.label;
  labelEl.style.cursor = 'pointer';
  labelEl.addEventListener('click', () => {
    const defaults = getDefaults();
    if (key in defaults) {
      const defaultVal = Math.min(def.max, Math.max(def.min, defaults[key]));
      params[key] = defaultVal;
      input.value = defaultVal;
      valueEl.textContent = formatValue(defaultVal, def.step);
      updateControlVisibility();
    }
  });

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

  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    params[key] = val;
    valueEl.textContent = formatValue(val, def.step);
  });

  sliderElements[key] = { input, valueEl, def };

  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(valueEl);
  return row;
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
      updateControlVisibility();
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
      updateControlVisibility();
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
    btn.className = 'mirror-mode-btn';
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
// Feedback blend mode selector factory
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
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return val.toFixed(decimals);
}

// -------------------------------------------------------------------------
// Control visibility -- show/hide sliders based on current mode selections.
// -------------------------------------------------------------------------

/** Movement visibility rules per mode (suffix keys). */
const MOVEMENT_VISIBILITY = {
  0: ['MovementSpeed', 'MovementAmplitude'],                                                   // Sine
  1: ['MovementSpeed', 'MovementAmplitude', 'MovementPhase', 'MovementLissajousRatio'],        // Lissajous
  2: ['MovementSpeed', 'MovementAmplitude', 'MovementSpiralSpeed'],                            // Spiral
  3: ['MovementScrollAngle', 'MovementScrollSpeed'],                                           // Scroll
  4: ['MovementBounceSpeed', 'MovementAmplitude'],                                             // Bounce
  5: [],                                                                                       // Fixed
};

/** All movement suffix keys (for hiding). */
const ALL_MOVEMENT_SUFFIXES = [
  'MovementSpeed', 'MovementAmplitude', 'MovementPhase', 'MovementLissajousRatio',
  'MovementSpiralSpeed', 'MovementScrollAngle', 'MovementScrollSpeed', 'MovementBounceSpeed',
];

/** Color mode visibility: which param keys are visible per color mode. */
const COLOR_MODE_VISIBILITY = {
  0: [],                                                                    // Direct
  1: ['colorGradientHue1', 'colorGradientHue2', 'colorGradientHue3'],      // Gradient
  2: ['colorPosterizeLevels'],                                              // Posterize
  3: [],                                                                    // Negative
  4: [],                                                                    // Thermal
};

/** Color params that are conditionally visible. */
const CONDITIONAL_COLOR_PARAMS = [
  'colorPosterizeLevels', 'colorGradientHue1', 'colorGradientHue2', 'colorGradientHue3',
];

/**
 * Show or hide a slider row by adding/removing the 'hidden' class.
 */
function setSliderVisible(paramKey, visible) {
  if (!panel) return;
  const row = panel.querySelector(`.slider-row[data-param="${paramKey}"]`);
  if (!row) return;
  if (visible) {
    row.classList.remove('hidden');
  } else {
    row.classList.add('hidden');
  }
}

/**
 * Update the visibility of all conditionally-shown slider rows.
 */
function updateControlVisibility() {
  // -- Kaleidoscope angle --
  const kalVisible = params.mirrorMode >= 4 && params.mirrorMode <= 6;
  setSliderVisible('kaleidoscopeAngle', kalVisible);

  // -- Color controls --
  const visibleColor = COLOR_MODE_VISIBILITY[params.colorMode] || [];
  for (const key of CONDITIONAL_COLOR_PARAMS) {
    setSliderVisible(key, visibleColor.includes(key));
  }

  // -- Per-oscillator controls --
  for (const prefix of ['osc1', 'osc2']) {
    // Enable toggle
    syncOscEnableToggle(prefix);

    // Movement visibility
    const movementMode = params[prefix + 'MovementMode'];
    const visibleSuffixes = MOVEMENT_VISIBILITY[movementMode] || [];
    for (const suffix of ALL_MOVEMENT_SUFFIXES) {
      setSliderVisible(prefix + suffix, visibleSuffixes.includes(suffix));
    }

    // Angle LFO
    syncOscAngleLFOToggle(prefix);
  }
}

// -------------------------------------------------------------------------
// Sync all sliders to current params (after preset/reset/randomize).
// -------------------------------------------------------------------------

function syncSliders() {
  for (const [key, { input, valueEl, def }] of Object.entries(sliderElements)) {
    input.value = params[key];
    valueEl.textContent = formatValue(params[key], def.step);
  }

  // Global buttons
  syncColorModeButtons();
  syncMirrorModeButtons();
  syncMirrorTargetButtons();
  syncBlendModeButtons();

  // Per-oscillator buttons
  for (const prefix of ['osc1', 'osc2']) {
    syncOscWaveformButtons(prefix);
    syncOscBlendModeButtons(prefix);
    syncOscMovementModeButtons(prefix);
    syncOscEnableToggle(prefix);
    syncOscAngleLFOToggle(prefix);
    syncOscAngleLFOWaveformButtons(prefix);
  }

  updateControlVisibility();
}

// -------------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------------

function applyPresetData(presetParams) {
  if (!presetParams) return;
  for (const [key, val] of Object.entries(presetParams)) {
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

    // Integer selectors
    if (INTEGER_RANDOM_KEYS.has(key)) {
      params[key] = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
      continue;
    }

    // Snap to the step grid
    const el = sliderElements[key];
    if (el) {
      const raw = rMin + Math.random() * (rMax - rMin);
      params[key] = snapToStep(raw, el.def.step, el.def.min, el.def.max);
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
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        panel.classList.toggle('visible');
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

      case 's':
      case 'S':
        e.preventDefault();
        handleSavePreset();
        break;
    }
  });
}

// -------------------------------------------------------------------------
// Public init
// -------------------------------------------------------------------------

/**
 * Initialize the overlay UI. Call once after the renderer is running.
 * @param {import('./renderer.js').Renderer} renderer - Renderer instance for screenshot capture.
 */
export function initUI(renderer) {
  _renderer = renderer;

  createPanel();
  updateControlVisibility();
  setupEvents();

  // Load presets asynchronously (non-blocking).
  populateFactoryPresets().catch((err) => {
    console.warn('Failed to load factory presets:', err);
  });
  populateUserPresets().catch((err) => {
    console.warn('Failed to load user presets:', err);
  });
}
