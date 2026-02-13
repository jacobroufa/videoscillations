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
  mirrorMode:         0,       // 0=None,1=H Mirror,2=V Mirror,3=Quad,4=Kal2,5=Kal4,6=Kal8
  kaleidoscopeAngle:  0.0,     // rotation offset for kaleidoscope wedge (0 to 2*PI)
  feedbackBlendMode:  0,       // 0=Multiply,1=Screen,2=Soft Burn,3=Freeze

  // -- Shape oscillator ---------------------------------------------------
  shapeType:          0,       // 0=circle,1=ring,2=line,3=cross,4=diamond,5=star,6=triangle
  shapeFreqX:         0.5,
  shapeFreqY:         0.7,
  shapeRadius:        0.08,
  shapeRadiusModAmt:  0.03,
  shapeRadiusModFreq: 1.2,
  shapeSoftness:      0.02,
  shapeRingWidth:     0.02,    // ring thickness (type 1)
  shapeLineAngle:     0.0,     // line rotation in radians (type 2)
  shapeLineThickness: 0.01,    // line / cross thickness (types 2, 3)

  // -- Movement -----------------------------------------------------------
  movementMode:           0,       // 0=Sine,1=Lissajous,2=Spiral,3=Scroll,4=Bounce,5=Fixed
  movementAmplitude:      0.3,     // how far from center (0-0.5)
  movementPhase:          0.0,     // Lissajous phase offset (0 to 2*PI)
  movementSpiralSpeed:    1.0,     // spiral angular speed
  movementSpiralExpand:   0.1,     // spiral growth rate
  movementScrollAngle:    0.0,     // scroll direction in radians (0 to 2*PI)
  movementScrollSpeed:    0.5,     // scroll speed
  movementBounceSpeed:    0.3,     // bounce velocity

  // -- Color --------------------------------------------------------------
  hueRotationSpeed:   0.001,
  baseBrightness:     1.0,
  saturation:         1.0,

  // -- Shape color --------------------------------------------------------
  shapeHue:           0.0,    // hue of the shape (0-1, HSV)
  shapeColorSat:      0.0,    // saturation of shape color (0 = white)

  // -- Color modes --------------------------------------------------------
  colorMode:              0,      // 0=Direct,1=Gradient,2=Posterize,3=Negative,4=Thermal
  colorPosterizeLevels:   6,      // posterize mode: number of discrete levels (2-16)
  colorGradientHue1:      0.66,   // gradient dark-end hue (blue)
  colorGradientHue2:      0.0,    // gradient mid hue (red)
  colorGradientHue3:      0.15,   // gradient bright-end hue (yellow)
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
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    feedbackBlendMode:  0,
    shapeType:          0,
    shapeFreqX:         0.2,
    shapeFreqY:         0.15,
    shapeRadius:        0.1,
    shapeRadiusModAmt:  0.02,
    shapeRadiusModFreq: 0.4,
    shapeSoftness:      0.04,
    shapeRingWidth:     0.02,
    shapeLineAngle:     0.0,
    shapeLineThickness: 0.01,
    movementMode:       0,       // sine
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpiralSpeed:  1.0,
    movementSpiralExpand: 0.1,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.0008,
    baseBrightness:     0.9,
    saturation:         1.2,
    shapeHue:           0.0,
    shapeColorSat:      0.0,
    colorMode:          0,
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
  },

  'Tunnel Vision': {
    feedbackRotation:   0.005,
    feedbackZoom:       1.015,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.985,
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    feedbackBlendMode:  0,
    shapeType:          1,       // ring
    shapeFreqX:         0.0,
    shapeFreqY:         0.0,
    shapeRadius:        0.12,
    shapeRadiusModAmt:  0.01,
    shapeRadiusModFreq: 0.8,
    shapeSoftness:      0.03,
    shapeRingWidth:     0.015,
    shapeLineAngle:     0.0,
    shapeLineThickness: 0.01,
    movementMode:       5,       // fixed center -- tunnel effect
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpiralSpeed:  1.0,
    movementSpiralExpand: 0.1,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.003,
    baseBrightness:     1.1,
    saturation:         1.0,
    shapeHue:           0.55,
    shapeColorSat:      0.7,
    colorMode:          4,       // thermal
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
  },

  'Chaos Spiral': {
    feedbackRotation:   0.06,
    feedbackZoom:       0.997,
    feedbackXShift:     0.003,
    feedbackYShift:    -0.002,
    feedbackDecay:      0.96,
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    feedbackBlendMode:  0,
    shapeType:          5,       // star
    shapeFreqX:         2.1,
    shapeFreqY:         1.7,
    shapeRadius:        0.04,
    shapeRadiusModAmt:  0.05,
    shapeRadiusModFreq: 3.0,
    shapeSoftness:      0.01,
    shapeRingWidth:     0.02,
    shapeLineAngle:     0.0,
    shapeLineThickness: 0.01,
    movementMode:       2,       // spiral
    movementAmplitude:  0.35,
    movementPhase:      0.0,
    movementSpiralSpeed:  2.5,
    movementSpiralExpand: 0.15,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.008,
    baseBrightness:     1.3,
    saturation:         1.5,
    shapeHue:           0.0,
    shapeColorSat:      0.0,
    colorMode:          2,       // posterize
    colorPosterizeLevels: 4,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
  },

  'Breathing Pulse': {
    feedbackRotation:   0.0,
    feedbackZoom:       1.01,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.92,
    mirrorMode:         3,       // quad mirror
    kaleidoscopeAngle:  0.0,
    feedbackBlendMode:  1,       // screen -- fades to white
    shapeType:          4,       // diamond
    shapeFreqX:         0.3,
    shapeFreqY:         0.3,
    shapeRadius:        0.15,
    shapeRadiusModAmt:  0.08,
    shapeRadiusModFreq: 0.3,
    shapeSoftness:      0.06,
    shapeRingWidth:     0.02,
    shapeLineAngle:     0.0,
    shapeLineThickness: 0.01,
    movementMode:       1,       // lissajous
    movementAmplitude:  0.25,
    movementPhase:      1.571,   // PI/2 -- figure-8
    movementSpiralSpeed:  1.0,
    movementSpiralExpand: 0.1,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.002,
    baseBrightness:     1.0,
    saturation:         0.8,
    shapeHue:           0.3,
    shapeColorSat:      0.6,
    colorMode:          1,       // gradient map
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.75,    // violet
    colorGradientHue2:  0.0,     // red
    colorGradientHue3:  0.12,    // orange
  },

  'Kaleidoscope': {
    feedbackRotation:   0.025,
    feedbackZoom:       1.002,
    feedbackXShift:     0.002,
    feedbackYShift:     0.001,
    feedbackDecay:      0.96,
    mirrorMode:         6,       // kaleidoscope 8-fold
    kaleidoscopeAngle:  0.3,     // slight rotation offset for visual interest
    feedbackBlendMode:  0,       // multiply
    shapeType:          6,       // triangle
    shapeFreqX:         1.3,
    shapeFreqY:         0.9,
    shapeRadius:        0.05,
    shapeRadiusModAmt:  0.04,
    shapeRadiusModFreq: 1.8,
    shapeSoftness:      0.02,
    shapeRingWidth:     0.02,
    shapeLineAngle:     0.0,
    shapeLineThickness: 0.01,
    movementMode:       4,       // bounce
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpiralSpeed:  1.0,
    movementSpiralExpand: 0.1,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.4,
    hueRotationSpeed:   0.004,
    baseBrightness:     1.0,
    saturation:         1.3,
    shapeHue:           0.0,
    shapeColorSat:      0.0,
    colorMode:          3,       // negative
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
  },

  'Cross Weave': {
    feedbackRotation:   0.015,
    feedbackZoom:       1.003,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.97,
    mirrorMode:         1,       // horizontal mirror
    kaleidoscopeAngle:  0.0,
    feedbackBlendMode:  0,
    shapeType:          3,       // cross
    shapeFreqX:         0.8,
    shapeFreqY:         0.6,
    shapeRadius:        0.1,
    shapeRadiusModAmt:  0.03,
    shapeRadiusModFreq: 1.0,
    shapeSoftness:      0.015,
    shapeRingWidth:     0.02,
    shapeLineAngle:     0.0,
    shapeLineThickness: 0.008,
    movementMode:       3,       // directional scroll
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpiralSpeed:  1.0,
    movementSpiralExpand: 0.1,
    movementScrollAngle:  0.785,   // ~45 degrees
    movementScrollSpeed:  0.3,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.005,
    baseBrightness:     1.1,
    saturation:         1.2,
    shapeHue:           0.6,
    shapeColorSat:      0.8,
    colorMode:          0,
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
  },

  'Laser Scan': {
    feedbackRotation:   0.008,
    feedbackZoom:       1.008,
    feedbackXShift:     0.002,
    feedbackYShift:     0.0,
    feedbackDecay:      0.94,
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    feedbackBlendMode:  2,       // soft burn
    shapeType:          2,       // line
    shapeFreqX:         1.5,
    shapeFreqY:         0.4,
    shapeRadius:        0.18,
    shapeRadiusModAmt:  0.06,
    shapeRadiusModFreq: 0.5,
    shapeSoftness:      0.01,
    shapeRingWidth:     0.02,
    shapeLineAngle:     0.785,   // ~45 degrees
    shapeLineThickness: 0.006,
    movementMode:       1,       // lissajous
    movementAmplitude:  0.35,
    movementPhase:      2.094,   // 2*PI/3 -- interesting loop
    movementSpiralSpeed:  1.0,
    movementSpiralExpand: 0.1,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.006,
    baseBrightness:     1.2,
    saturation:         1.4,
    shapeHue:           0.0,
    shapeColorSat:      0.0,
    colorMode:          0,
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
  },
};
