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
  polarizationAngle:  { label: 'Polarization',    min: 0.0,   max: 6.283, step: 0.01,  group: 'Shape' },
  polarizationSpeed:  { label: 'Polar Speed',     min: -2.0,  max: 2.0,  step: 0.01,   group: 'Shape' },
  shapeFractalAmount: { label: 'Fractal Amount',  min: 0,     max: 6,    step: 1,      group: 'Shape' },
  shapeFractalAngle:  { label: 'Fractal Angle',   min: 0.0,   max: 6.283, step: 0.01,  group: 'Shape' },

  // Angle LFO sub-section (within Shape group)
  angleLFORate:       { label: 'LFO Rate',        min: 0.01,  max: 5.0,  step: 0.01,   group: 'Shape' },
  angleLFODepth:      { label: 'LFO Depth',       min: 0.0,   max: 3.14159, step: 0.01, group: 'Shape' },

  // Movement group (movementMode is handled by button selector)
  movementSpeed:          { label: 'Speed',           min: 0.0,   max: 5.0,   step: 0.01,   group: 'Movement' },
  movementAmplitude:      { label: 'Amplitude',       min: 0.0,   max: 0.5,   step: 0.01,   group: 'Movement' },
  movementPhase:          { label: 'Phase',           min: 0.0,   max: 6.283, step: 0.01,   group: 'Movement' },
  movementLissajousRatio: { label: 'Lissajous Ratio', min: 0.1,   max: 3.0,   step: 0.01,   group: 'Movement' },
  movementSpiralSpeed:    { label: 'Spiral Speed',    min: 0.0,   max: 5.0,   step: 0.1,    group: 'Movement' },
  movementScrollAngle:    { label: 'Scroll Angle',    min: 0.0,   max: 6.283, step: 0.01,   group: 'Movement' },
  movementScrollSpeed:    { label: 'Scroll Speed',    min: 0.0,   max: 2.0,   step: 0.01,   group: 'Movement' },
  movementBounceSpeed:    { label: 'Bounce Speed',    min: 0.0,   max: 2.0,   step: 0.01,   group: 'Movement' },

  // Oscillator 2 group
  osc2Frequency:          { label: 'Frequency',       min: 0.5,   max: 20.0, step: 0.1,    group: 'Oscillator 2' },
  osc2Angle:              { label: 'Angle',           min: 0.0,   max: 6.283, step: 0.01,  group: 'Oscillator 2' },
  osc2Thickness:          { label: 'Thickness',       min: 0.01,  max: 0.99, step: 0.01,   group: 'Oscillator 2' },
  osc2Softness:           { label: 'Softness',        min: 0.0,   max: 0.1,  step: 0.005,  group: 'Oscillator 2' },
  osc2PhaseOffset:        { label: 'Phase Offset',    min: 0.0,   max: 6.283, step: 0.01,  group: 'Oscillator 2' },
  osc2Hue:                { label: 'Hue',             min: 0.0,   max: 1.0,  step: 0.01,   group: 'Oscillator 2' },
  osc2ColorSat:           { label: 'Color Sat',       min: 0.0,   max: 1.0,  step: 0.01,   group: 'Oscillator 2' },
  osc2FractalAmount:      { label: 'Fractal Amount',  min: 0,     max: 6,    step: 1,      group: 'Oscillator 2' },
  osc2FractalAngle:       { label: 'Fractal Angle',   min: 0.0,   max: 6.283, step: 0.01,  group: 'Oscillator 2' },
  osc2MovementSpeed:      { label: 'Move Speed',      min: 0.0,   max: 5.0,  step: 0.01,   group: 'Oscillator 2' },
  osc2MovementAmplitude:  { label: 'Move Amplitude',  min: 0.0,   max: 0.5,  step: 0.01,   group: 'Oscillator 2' },
  osc2MovementPhase:      { label: 'Move Phase',      min: 0.0,   max: 6.283, step: 0.01,  group: 'Oscillator 2' },

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

// Osc2 blend mode names.
const OSC2_BLEND_MODE_NAMES = ['Add', 'Multiply', 'Mask', 'Difference', 'Phase Mod'];

// Angle LFO waveform names.
const ANGLE_LFO_WAVEFORM_NAMES = ['Sine', 'Triangle', 'Saw', 'Square', 'S&H'];

// Group ordering
const GROUPS = ['Feedback', 'Shape', 'Oscillator 2', 'Movement', 'Color'];

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
  shapeWaveform:      { min: 0,      max: 5     },
  shapeFrequency:     { min: 1.0,    max: 12.0  },
  shapeAngle:         { min: 0.0,    max: 6.283 },
  shapeThickness:     { min: 0.1,    max: 0.9   },
  shapeSoftness:      { min: 0.005,  max: 0.06  },
  shapePhaseOffset:   { min: 0.0,    max: 6.283 },
  polarizationAngle:  { min: 0.0,    max: 6.283 },
  polarizationSpeed:  { min: -0.5,   max: 0.5   },
  angleLFOEnabled:    { min: 0,      max: 1     },
  angleLFOWaveform:   { min: 0,      max: 4     },
  angleLFORate:       { min: 0.05,   max: 2.0   },
  angleLFODepth:      { min: 0.0,    max: 1.57  },
  shapeFractalAmount: { min: 0,      max: 6     },
  shapeFractalAngle:  { min: 0.0,    max: 6.283 },
  osc2Enabled:        { min: 0,      max: 1     },
  osc2Waveform:       { min: 0,      max: 5     },
  osc2Frequency:      { min: 1.0,    max: 12.0  },
  osc2Angle:          { min: 0.0,    max: 6.283 },
  osc2Thickness:      { min: 0.1,    max: 0.9   },
  osc2Softness:       { min: 0.005,  max: 0.06  },
  osc2PhaseOffset:    { min: 0.0,    max: 6.283 },
  osc2Hue:            { min: 0.0,    max: 1.0   },
  osc2ColorSat:       { min: 0.3,    max: 1.0   },
  osc2BlendMode:      { min: 0,      max: 4     },
  osc2MovementMode:   { min: 0,      max: 5     },
  osc2MovementSpeed:  { min: 0.1,    max: 3.0   },
  osc2MovementAmplitude: { min: 0.1, max: 0.45  },
  osc2MovementPhase:  { min: 0.0,    max: 6.283 },
  osc2FractalAmount:  { min: 0,      max: 6     },
  osc2FractalAngle:   { min: 0.0,    max: 6.283 },
  movementMode:           { min: 0,      max: 5     },
  movementAmplitude:      { min: 0.1,    max: 0.45  },
  movementPhase:          { min: 0.0,    max: 6.283 },
  movementLissajousRatio: { min: 0.1,    max: 2.5   },
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
  colorMode:            { min: 0,      max: 4     },
  colorPosterizeLevels: { min: 2,      max: 12    },
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
let waveformButtons = [];
let movementModeButtons = [];
let colorModeButtons = [];
let mirrorModeButtons = [];
let mirrorTargetButtons = [];
let blendModeButtons = [];
let osc2WaveformButtons = [];
let osc2BlendModeButtons = [];
let osc2MovementModeButtons = [];
let angleLFOToggleBtn = null;
let angleLFOWaveformButtons = [];
let osc2EnableBtn = null;
let osc2ControlsContainer = null;
let angleLFOControlsContainer = null;

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
// Controls tab builder (existing UI moved under a tab)
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

    // Insert Osc2 enable toggle and controls at the top of Oscillator 2 group.
    if (group === 'Oscillator 2') {
      section.appendChild(createOsc2EnableToggle());

      // Create a container for all Osc2 controls (collapses when disabled).
      osc2ControlsContainer = document.createElement('div');
      osc2ControlsContainer.className = 'collapsible-section';
      if (!params.osc2Enabled) osc2ControlsContainer.classList.add('collapsed');

      osc2ControlsContainer.appendChild(createOsc2BlendModeSelector());
      osc2ControlsContainer.appendChild(createOsc2WaveformSelector());
      osc2ControlsContainer.appendChild(createOsc2MovementModeSelector());

      // Add Osc2 sliders into the container.
      for (const [key, def] of Object.entries(CONTROL_DEFS)) {
        if (def.group !== 'Oscillator 2') continue;
        osc2ControlsContainer.appendChild(createSlider(key, def));
      }

      section.appendChild(osc2ControlsContainer);
    }

    // For Shape group, add sliders then angle LFO sub-section.
    if (group === 'Shape') {
      // Add Shape sliders (excluding LFO ones which come after).
      for (const [key, def] of Object.entries(CONTROL_DEFS)) {
        if (def.group !== group) continue;
        if (key === 'angleLFORate' || key === 'angleLFODepth') continue;
        section.appendChild(createSlider(key, def));
      }

      // Angle LFO sub-section.
      section.appendChild(createAngleLFOSection());
    } else if (group !== 'Oscillator 2') {
      // For other groups (not Shape, not Osc2), add sliders normally.
      for (const [key, def] of Object.entries(CONTROL_DEFS)) {
        if (def.group !== group) continue;
        section.appendChild(createSlider(key, def));
      }
    }

    container.appendChild(section);
  }

  // -- Keyboard hint at the bottom ----------------------------------------
  const hint = document.createElement('div');
  hint.className = 'keyboard-hint';
  hint.innerHTML = '<kbd>Tab</kbd> toggle UI &nbsp; <kbd>Space</kbd> randomize &nbsp; <kbd>R</kbd> reset &nbsp; <kbd>F</kbd> fullscreen &nbsp; <kbd>S</kbd> save preset';
  container.appendChild(hint);
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

/**
 * Create a preset card element.
 * @param {object} preset - Preset data object with id, name, builtIn, params.
 * @param {string|null} thumbnailURL - Object URL for the thumbnail or null.
 * @param {boolean} isBuiltIn - Whether this is a factory preset.
 * @returns {HTMLElement}
 */
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
    // Don't load if clicking an action button, input, or confirm dialog
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

    // Rename
    const renameBtn = document.createElement('button');
    renameBtn.className = 'action-icon';
    renameBtn.title = 'Rename';
    renameBtn.textContent = '\u270E'; // pencil
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startInlineRename(card, preset);
    });

    // Re-capture screenshot
    const cameraBtn = document.createElement('button');
    cameraBtn.className = 'action-icon';
    cameraBtn.title = 'Re-capture screenshot';
    cameraBtn.textContent = '\u25CE'; // bullseye / camera-like
    cameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleRecapture(card, preset);
    });

    // Delete preset
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-icon danger';
    deleteBtn.title = 'Delete preset';
    deleteBtn.textContent = '\u2715'; // X mark
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirm(card, preset);
    });

    hoverActions.appendChild(renameBtn);
    hoverActions.appendChild(cameraBtn);
    hoverActions.appendChild(deleteBtn);
    card.appendChild(hoverActions);

    // Screenshot-specific actions (bottom-right, only if screenshot exists)
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
      input.value = preset.name; // revert
      input.blur();
    }
  });
}

// -------------------------------------------------------------------------
// Delete confirmation
// -------------------------------------------------------------------------

function showDeleteConfirm(card, preset) {
  // Remove any existing confirm dialog
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
    // Remove from cache
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

      // Remove empty state if present
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
      // Refresh the user presets grid
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

  // Remove empty state if present
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
// Angle LFO sub-section factory
// -------------------------------------------------------------------------

function createAngleLFOSection() {
  const wrapper = document.createElement('div');
  wrapper.className = 'subsection';

  // Toggle button.
  angleLFOToggleBtn = document.createElement('button');
  angleLFOToggleBtn.className = 'subsection-toggle-btn';
  angleLFOToggleBtn.textContent = params.angleLFOEnabled ? 'Angle LFO: ON' : 'Angle LFO: OFF';
  if (params.angleLFOEnabled) angleLFOToggleBtn.classList.add('active');

  angleLFOToggleBtn.addEventListener('click', () => {
    params.angleLFOEnabled = params.angleLFOEnabled ? 0 : 1;
    syncAngleLFOToggle();
    updateControlVisibility();
  });

  wrapper.appendChild(angleLFOToggleBtn);

  // Collapsible container for LFO controls.
  angleLFOControlsContainer = document.createElement('div');
  angleLFOControlsContainer.className = 'collapsible-section';
  if (!params.angleLFOEnabled) angleLFOControlsContainer.classList.add('collapsed');

  // LFO waveform selector.
  angleLFOControlsContainer.appendChild(createAngleLFOWaveformSelector());

  // LFO sliders.
  for (const key of ['angleLFORate', 'angleLFODepth']) {
    const def = CONTROL_DEFS[key];
    angleLFOControlsContainer.appendChild(createSlider(key, def));
  }

  wrapper.appendChild(angleLFOControlsContainer);
  return wrapper;
}

function syncAngleLFOToggle() {
  if (angleLFOToggleBtn) {
    angleLFOToggleBtn.textContent = params.angleLFOEnabled ? 'Angle LFO: ON' : 'Angle LFO: OFF';
    angleLFOToggleBtn.classList.toggle('active', !!params.angleLFOEnabled);
  }
  if (angleLFOControlsContainer) {
    angleLFOControlsContainer.classList.toggle('collapsed', !params.angleLFOEnabled);
  }
}

// -------------------------------------------------------------------------
// Angle LFO waveform selector
// -------------------------------------------------------------------------

function createAngleLFOWaveformSelector() {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  angleLFOWaveformButtons = [];

  for (let i = 0; i < ANGLE_LFO_WAVEFORM_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = ANGLE_LFO_WAVEFORM_NAMES[i];
    if (i === params.angleLFOWaveform) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.angleLFOWaveform = i;
      syncAngleLFOWaveformButtons();
    });

    angleLFOWaveformButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncAngleLFOWaveformButtons() {
  for (let i = 0; i < angleLFOWaveformButtons.length; i++) {
    angleLFOWaveformButtons[i].classList.toggle('active', i === params.angleLFOWaveform);
  }
}

// -------------------------------------------------------------------------
// Osc2 enable toggle factory
// -------------------------------------------------------------------------

function createOsc2EnableToggle() {
  osc2EnableBtn = document.createElement('button');
  osc2EnableBtn.className = 'subsection-toggle-btn';
  osc2EnableBtn.textContent = params.osc2Enabled ? 'Enabled' : 'Disabled';
  if (params.osc2Enabled) osc2EnableBtn.classList.add('active');

  osc2EnableBtn.addEventListener('click', () => {
    params.osc2Enabled = params.osc2Enabled ? 0 : 1;
    syncOsc2EnableToggle();
    updateControlVisibility();
  });

  return osc2EnableBtn;
}

function syncOsc2EnableToggle() {
  if (osc2EnableBtn) {
    osc2EnableBtn.textContent = params.osc2Enabled ? 'Enabled' : 'Disabled';
    osc2EnableBtn.classList.toggle('active', !!params.osc2Enabled);
  }
  if (osc2ControlsContainer) {
    osc2ControlsContainer.classList.toggle('collapsed', !params.osc2Enabled);
  }
}

// -------------------------------------------------------------------------
// Osc2 blend mode selector factory
// -------------------------------------------------------------------------

function createOsc2BlendModeSelector() {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  osc2BlendModeButtons = [];

  for (let i = 0; i < OSC2_BLEND_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = OSC2_BLEND_MODE_NAMES[i];
    if (i === params.osc2BlendMode) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.osc2BlendMode = i;
      syncOsc2BlendModeButtons();
    });

    osc2BlendModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOsc2BlendModeButtons() {
  for (let i = 0; i < osc2BlendModeButtons.length; i++) {
    osc2BlendModeButtons[i].classList.toggle('active', i === params.osc2BlendMode);
  }
}

// -------------------------------------------------------------------------
// Osc2 waveform selector factory
// -------------------------------------------------------------------------

function createOsc2WaveformSelector() {
  const row = document.createElement('div');
  row.className = 'shape-type-row';

  osc2WaveformButtons = [];

  for (let i = 0; i < WAVEFORM_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'shape-type-btn';
    btn.textContent = WAVEFORM_NAMES[i];
    if (i === params.osc2Waveform) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.osc2Waveform = i;
      syncOsc2WaveformButtons();
    });

    osc2WaveformButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOsc2WaveformButtons() {
  for (let i = 0; i < osc2WaveformButtons.length; i++) {
    osc2WaveformButtons[i].classList.toggle('active', i === params.osc2Waveform);
  }
}

// -------------------------------------------------------------------------
// Osc2 movement mode selector factory
// -------------------------------------------------------------------------

function createOsc2MovementModeSelector() {
  const row = document.createElement('div');
  row.className = 'movement-mode-row';

  osc2MovementModeButtons = [];

  for (let i = 0; i < MOVEMENT_MODE_NAMES.length; i++) {
    const btn = document.createElement('button');
    btn.className = 'movement-mode-btn';
    btn.textContent = MOVEMENT_MODE_NAMES[i];
    if (i === params.osc2MovementMode) btn.classList.add('active');

    btn.addEventListener('click', () => {
      params.osc2MovementMode = i;
      syncOsc2MovementModeButtons();
      updateControlVisibility();
    });

    osc2MovementModeButtons.push(btn);
    row.appendChild(btn);
  }

  return row;
}

function syncOsc2MovementModeButtons() {
  for (let i = 0; i < osc2MovementModeButtons.length; i++) {
    osc2MovementModeButtons[i].classList.toggle('active', i === params.osc2MovementMode);
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
      updateControlVisibility();
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
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return val.toFixed(decimals);
}

// -------------------------------------------------------------------------
// Control visibility -- show/hide sliders based on current mode selections.
// -------------------------------------------------------------------------

/** Visibility rules per movement mode: which param keys are visible. */
const MOVEMENT_VISIBILITY = {
  0: ['movementSpeed', 'movementAmplitude'],                                               // Sine
  1: ['movementSpeed', 'movementAmplitude', 'movementPhase', 'movementLissajousRatio'],    // Lissajous
  2: ['movementSpeed', 'movementAmplitude', 'movementSpiralSpeed'],                        // Spiral
  3: ['movementScrollAngle', 'movementScrollSpeed'],                                       // Scroll
  4: ['movementBounceSpeed', 'movementAmplitude'],                                         // Bounce
  5: [],                                                                                   // Fixed
};

/** All movement param keys (for hiding). */
const ALL_MOVEMENT_PARAMS = [
  'movementSpeed', 'movementAmplitude', 'movementPhase', 'movementLissajousRatio',
  'movementSpiralSpeed', 'movementScrollAngle', 'movementScrollSpeed', 'movementBounceSpeed',
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

/** Osc2 movement visibility rules. */
const OSC2_MOVEMENT_VISIBILITY = {
  0: ['osc2MovementSpeed', 'osc2MovementAmplitude'],                         // Sine
  1: ['osc2MovementSpeed', 'osc2MovementAmplitude', 'osc2MovementPhase'],    // Lissajous
  2: ['osc2MovementSpeed', 'osc2MovementAmplitude'],                         // Spiral
  3: ['osc2MovementSpeed'],                                                  // Scroll
  4: ['osc2MovementSpeed', 'osc2MovementAmplitude'],                         // Bounce
  5: [],                                                                     // Fixed
};

/** All Osc2 movement param keys (for hiding). */
const ALL_OSC2_MOVEMENT_PARAMS = [
  'osc2MovementSpeed', 'osc2MovementAmplitude', 'osc2MovementPhase',
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
  // -- Movement controls --
  const visibleMovement = MOVEMENT_VISIBILITY[params.movementMode] || [];
  for (const key of ALL_MOVEMENT_PARAMS) {
    setSliderVisible(key, visibleMovement.includes(key));
  }

  // -- Kaleidoscope angle --
  const kalVisible = params.mirrorMode >= 4 && params.mirrorMode <= 6;
  setSliderVisible('kaleidoscopeAngle', kalVisible);

  // -- Color controls --
  const visibleColor = COLOR_MODE_VISIBILITY[params.colorMode] || [];
  for (const key of CONDITIONAL_COLOR_PARAMS) {
    setSliderVisible(key, visibleColor.includes(key));
  }

  // -- Osc2 controls --
  syncOsc2EnableToggle();
  const visibleOsc2Movement = OSC2_MOVEMENT_VISIBILITY[params.osc2MovementMode] || [];
  for (const key of ALL_OSC2_MOVEMENT_PARAMS) {
    setSliderVisible(key, visibleOsc2Movement.includes(key));
  }

  // -- Angle LFO controls --
  syncAngleLFOToggle();
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
  syncOsc2WaveformButtons();
  syncOsc2BlendModeButtons();
  syncOsc2MovementModeButtons();
  syncOsc2EnableToggle();
  syncAngleLFOToggle();
  syncAngleLFOWaveformButtons();
  updateControlVisibility();
}

// -------------------------------------------------------------------------
// Actions
// -------------------------------------------------------------------------

/**
 * Apply preset params to the live params object and sync the UI.
 * Used by both built-in and user presets.
 */
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

    // Integer selectors -- not sliders, handle specially.
    if (key === 'shapeWaveform' || key === 'colorMode' || key === 'movementMode'
        || key === 'mirrorMode' || key === 'mirrorTarget' || key === 'feedbackBlendMode'
        || key === 'shapeFractalAmount' || key === 'angleLFOEnabled' || key === 'angleLFOWaveform'
        || key === 'osc2Enabled' || key === 'osc2Waveform' || key === 'osc2BlendMode'
        || key === 'osc2MovementMode' || key === 'osc2FractalAmount') {
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
    // Ignore if focus is on an input element (let sliders and inline edits work normally).
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
