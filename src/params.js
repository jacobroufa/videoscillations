/**
 * Central parameter store for the video synthesizer.
 *
 * Every tunable value lives here. They are wired to the overlay UI controls
 * (sliders) and can also be tweaked in the browser console:
 *
 *   import('./src/params.js').then(m => m.params.feedbackRotation = 0.03)
 *
 * Or simply: window.__params (exposed by main.js for convenience).
 */

// -------------------------------------------------------------------------
// Default values -- used for reset and as the initial state.
// -------------------------------------------------------------------------

const DEFAULTS = Object.freeze({
  // -- Feedback transforms ------------------------------------------------
  feedbackRotation:   0.01,
  feedbackZoom:       1.005,
  feedbackXShift:     0.0,
  feedbackYShift:     0.0,
  feedbackDecay:      0.97,

  // -- Shape oscillator ---------------------------------------------------
  shapeFreqX:         0.5,
  shapeFreqY:         0.7,
  shapeRadius:        0.08,
  shapeRadiusModAmt:  0.03,
  shapeRadiusModFreq: 1.2,
  shapeSoftness:      0.02,

  // -- Color --------------------------------------------------------------
  hueRotationSpeed:   0.001,
  baseBrightness:     1.0,
  saturation:         1.0,
});

/** Return a fresh copy of the default parameter values. */
export function getDefaults() {
  return { ...DEFAULTS };
}

export const params = { ...DEFAULTS };

// -------------------------------------------------------------------------
// Presets -- each is a complete set of parameter values.
// -------------------------------------------------------------------------

export const presets = {
  'Slow Drift': {
    feedbackRotation:   0.003,
    feedbackZoom:       1.001,
    feedbackXShift:     0.001,
    feedbackYShift:     0.0005,
    feedbackDecay:      0.985,
    shapeFreqX:         0.2,
    shapeFreqY:         0.15,
    shapeRadius:        0.1,
    shapeRadiusModAmt:  0.02,
    shapeRadiusModFreq: 0.4,
    shapeSoftness:      0.04,
    hueRotationSpeed:   0.0008,
    baseBrightness:     0.9,
    saturation:         1.2,
  },

  'Tunnel Vision': {
    feedbackRotation:   0.005,
    feedbackZoom:       1.015,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.985,
    shapeFreqX:         0.0,
    shapeFreqY:         0.0,
    shapeRadius:        0.12,
    shapeRadiusModAmt:  0.01,
    shapeRadiusModFreq: 0.8,
    shapeSoftness:      0.03,
    hueRotationSpeed:   0.003,
    baseBrightness:     1.1,
    saturation:         1.0,
  },

  'Chaos Spiral': {
    feedbackRotation:   0.06,
    feedbackZoom:       0.997,
    feedbackXShift:     0.003,
    feedbackYShift:    -0.002,
    feedbackDecay:      0.96,
    shapeFreqX:         2.1,
    shapeFreqY:         1.7,
    shapeRadius:        0.04,
    shapeRadiusModAmt:  0.05,
    shapeRadiusModFreq: 3.0,
    shapeSoftness:      0.01,
    hueRotationSpeed:   0.008,
    baseBrightness:     1.3,
    saturation:         1.5,
  },

  'Breathing Pulse': {
    feedbackRotation:   0.0,
    feedbackZoom:       1.01,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.92,
    shapeFreqX:         0.3,
    shapeFreqY:         0.3,
    shapeRadius:        0.15,
    shapeRadiusModAmt:  0.08,
    shapeRadiusModFreq: 0.3,
    shapeSoftness:      0.06,
    hueRotationSpeed:   0.002,
    baseBrightness:     1.0,
    saturation:         0.8,
  },

  'Kaleidoscope': {
    feedbackRotation:   0.025,
    feedbackZoom:       1.002,
    feedbackXShift:     0.002,
    feedbackYShift:     0.001,
    feedbackDecay:      0.96,
    shapeFreqX:         1.3,
    shapeFreqY:         0.9,
    shapeRadius:        0.05,
    shapeRadiusModAmt:  0.04,
    shapeRadiusModFreq: 1.8,
    shapeSoftness:      0.02,
    hueRotationSpeed:   0.004,
    baseBrightness:     1.0,
    saturation:         1.3,
  },
};
