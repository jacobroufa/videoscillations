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
  mirrorTarget:       2,       // 0=Feedback,1=Shape,2=Both,3=Output
  feedbackBlendMode:  0,       // 0=Multiply,1=Screen,2=Soft Burn,3=Freeze

  // -- Shape waveform oscillator ------------------------------------------
  shapeWaveform:      0,       // 0=Sine,1=Tan,2=Square,3=Circle,4=Diamond,5=Triangle
  shapeFrequency:     4.0,     // repetitions across screen
  shapeAngle:         0.0,     // rotation of waveform pattern (radians)
  shapeThickness:     0.5,     // duty cycle (0.0-1.0)
  shapeSoftness:      0.02,    // edge softness
  shapePhaseOffset:   0.0,     // waveform phase offset

  // -- Polarization -------------------------------------------------------
  polarizationAngle:  0.0,     // additional UV rotation (0 to 2*PI)
  polarizationSpeed:  0.0,     // auto-rotation speed (0 = manual only)

  // -- Angle LFO ---------------------------------------------------------
  angleLFOEnabled:    0,       // 0=off, 1=on
  angleLFOWaveform:   0,       // 0=Sine, 1=Triangle, 2=Sawtooth, 3=Square, 4=Random S&H
  angleLFORate:       0.5,     // Hz (0.01 to 5.0)
  angleLFODepth:      0.0,     // radians (0 to PI)

  // -- Shape fractalization -----------------------------------------------
  shapeFractalAmount: 0,       // 0=off, 1-6 = increasing fold counts
  shapeFractalAngle:  0.0,     // fractal mirror axis angle

  // -- Oscillator 2 ------------------------------------------------------
  osc2Enabled:            0,       // 0=off, 1=on
  osc2Waveform:           0,       // 0=Sine,1=Tan,2=Square,3=Circle,4=Diamond,5=Triangle
  osc2Frequency:          4.0,
  osc2Angle:              0.0,     // radians
  osc2Thickness:          0.5,
  osc2Softness:           0.02,
  osc2PhaseOffset:        0.0,
  osc2Hue:                0.5,
  osc2ColorSat:           1.0,
  osc2BlendMode:          0,       // 0=Add,1=Multiply,2=Mask,3=Difference,4=Phase Mod
  osc2MovementMode:       5,       // same as movementMode, default Fixed
  osc2MovementSpeed:      0.5,
  osc2MovementAmplitude:  0.3,
  osc2MovementPhase:      0.0,
  osc2FractalAmount:      0,
  osc2FractalAngle:       0.0,

  // -- Movement -----------------------------------------------------------
  movementMode:           0,       // 0=Sine,1=Lissajous,2=Spiral,3=Scroll,4=Bounce,5=Fixed
  movementAmplitude:      0.3,     // how far the phase shifts (0-0.5)
  movementPhase:          0.0,     // Lissajous phase offset (0 to 2*PI)
  movementSpeed:          0.5,     // primary movement speed
  movementLissajousRatio: 0.5,     // Lissajous Y-axis frequency ratio (0.1-3.0)
  movementSpiralSpeed:    1.0,     // spiral angular speed
  movementScrollAngle:    0.0,     // scroll direction in radians (0 to 2*PI)
  movementScrollSpeed:    0.5,     // scroll speed
  movementBounceSpeed:    0.3,     // bounce velocity

  // -- Color --------------------------------------------------------------
  hueRotationSpeed:   0.015,   // increased from 0.001 for visible hue cycling
  baseBrightness:     1.0,
  saturation:         1.0,

  // -- Shape color --------------------------------------------------------
  shapeHue:           0.0,    // hue of the shape (0-1, HSV)
  shapeColorSat:      1.0,    // CHANGED from 0.0 -- shapes are colored by default for working hue shift

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
    mirrorTarget:       2,
    feedbackBlendMode:  0,
    shapeWaveform:      0,       // sine
    shapeFrequency:     3.0,
    shapeAngle:         0.3,
    shapeThickness:     0.5,
    shapeSoftness:      0.04,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 0,
    shapeFractalAngle:  0.0,
    movementMode:       0,       // sine
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpeed:      0.2,
    movementLissajousRatio: 0.5,
    movementSpiralSpeed:  1.0,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.008,
    baseBrightness:     0.9,
    saturation:         1.2,
    shapeHue:           0.55,
    shapeColorSat:      0.8,
    colorMode:          0,
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },

  'Tunnel Vision': {
    feedbackRotation:   0.005,
    feedbackZoom:       1.015,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.985,
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    mirrorTarget:       2,
    feedbackBlendMode:  0,
    shapeWaveform:      3,       // circle (concentric rings)
    shapeFrequency:     8.0,
    shapeAngle:         0.0,
    shapeThickness:     0.4,
    shapeSoftness:      0.03,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 0,
    shapeFractalAngle:  0.0,
    movementMode:       5,       // fixed -- tunnel effect
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpeed:      0.0,
    movementLissajousRatio: 0.5,
    movementSpiralSpeed:  1.0,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.012,
    baseBrightness:     1.1,
    saturation:         1.0,
    shapeHue:           0.55,
    shapeColorSat:      0.7,
    colorMode:          4,       // thermal
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },

  'Chaos Spiral': {
    feedbackRotation:   0.06,
    feedbackZoom:       0.997,
    feedbackXShift:     0.003,
    feedbackYShift:    -0.002,
    feedbackDecay:      0.96,
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    mirrorTarget:       2,
    feedbackBlendMode:  0,
    shapeWaveform:      2,       // square
    shapeFrequency:     6.0,
    shapeAngle:         0.785,
    shapeThickness:     0.3,
    shapeSoftness:      0.01,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 3,       // 4-fold fractal
    shapeFractalAngle:  0.5,
    movementMode:       2,       // spiral
    movementAmplitude:  0.35,
    movementPhase:      0.0,
    movementSpeed:      2.1,
    movementLissajousRatio: 0.75,
    movementSpiralSpeed:  2.5,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.02,
    baseBrightness:     1.3,
    saturation:         1.5,
    shapeHue:           0.0,
    shapeColorSat:      1.0,
    colorMode:          2,       // posterize
    colorPosterizeLevels: 4,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },

  'Breathing Pulse': {
    feedbackRotation:   0.0,
    feedbackZoom:       1.01,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.92,
    mirrorMode:         3,       // quad mirror
    kaleidoscopeAngle:  0.0,
    mirrorTarget:       2,       // both
    feedbackBlendMode:  1,       // screen -- fades to white
    shapeWaveform:      4,       // diamond
    shapeFrequency:     5.0,
    shapeAngle:         0.0,
    shapeThickness:     0.6,
    shapeSoftness:      0.06,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 0,
    shapeFractalAngle:  0.0,
    movementMode:       1,       // lissajous
    movementAmplitude:  0.25,
    movementPhase:      1.571,   // PI/2 -- figure-8
    movementSpeed:      0.3,
    movementLissajousRatio: 0.5,
    movementSpiralSpeed:  1.0,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.01,
    baseBrightness:     1.0,
    saturation:         0.8,
    shapeHue:           0.3,
    shapeColorSat:      0.6,
    colorMode:          1,       // gradient map
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.75,    // violet
    colorGradientHue2:  0.0,     // red
    colorGradientHue3:  0.12,    // orange
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },

  'Kaleidoscope': {
    feedbackRotation:   0.025,
    feedbackZoom:       1.002,
    feedbackXShift:     0.002,
    feedbackYShift:     0.001,
    feedbackDecay:      0.96,
    mirrorMode:         6,       // kaleidoscope 8-fold
    kaleidoscopeAngle:  0.3,     // slight rotation offset for visual interest
    mirrorTarget:       2,       // both -- shape and feedback mirrored
    feedbackBlendMode:  0,       // multiply
    shapeWaveform:      5,       // triangle
    shapeFrequency:     3.0,
    shapeAngle:         0.0,
    shapeThickness:     0.5,
    shapeSoftness:      0.02,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 2,       // 2-fold fractal
    shapeFractalAngle:  0.0,
    movementMode:       4,       // bounce
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpeed:      1.3,
    movementLissajousRatio: 0.667,
    movementSpiralSpeed:  1.0,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.4,
    hueRotationSpeed:   0.015,
    baseBrightness:     1.0,
    saturation:         1.3,
    shapeHue:           0.8,
    shapeColorSat:      1.0,
    colorMode:          3,       // negative
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },

  'Sine Bars': {
    feedbackRotation:   0.015,
    feedbackZoom:       1.003,
    feedbackXShift:     0.0,
    feedbackYShift:     0.0,
    feedbackDecay:      0.97,
    mirrorMode:         1,       // horizontal mirror
    kaleidoscopeAngle:  0.0,
    mirrorTarget:       2,
    feedbackBlendMode:  0,
    shapeWaveform:      0,       // sine
    shapeFrequency:     6.0,
    shapeAngle:         0.0,
    shapeThickness:     0.5,
    shapeSoftness:      0.015,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 0,
    shapeFractalAngle:  0.0,
    movementMode:       3,       // directional scroll
    movementAmplitude:  0.3,
    movementPhase:      0.0,
    movementSpeed:      0.8,
    movementLissajousRatio: 0.5,
    movementSpiralSpeed:  1.0,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.3,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.012,
    baseBrightness:     1.1,
    saturation:         1.2,
    shapeHue:           0.6,
    shapeColorSat:      0.8,
    colorMode:          0,
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },

  'Digital Grid': {
    feedbackRotation:   0.008,
    feedbackZoom:       1.008,
    feedbackXShift:     0.002,
    feedbackYShift:     0.0,
    feedbackDecay:      0.94,
    mirrorMode:         0,
    kaleidoscopeAngle:  0.0,
    mirrorTarget:       2,
    feedbackBlendMode:  2,       // soft burn
    shapeWaveform:      2,       // square
    shapeFrequency:     10.0,
    shapeAngle:         0.785,   // ~45 degrees
    shapeThickness:     0.3,
    shapeSoftness:      0.005,
    shapePhaseOffset:   0.0,
    shapeFractalAmount: 4,       // 8-fold fractal
    shapeFractalAngle:  0.0,
    movementMode:       1,       // lissajous
    movementAmplitude:  0.35,
    movementPhase:      2.094,   // 2*PI/3 -- interesting loop
    movementSpeed:      1.5,
    movementLissajousRatio: 0.667,
    movementSpiralSpeed:  1.0,
    movementScrollAngle:  0.0,
    movementScrollSpeed:  0.5,
    movementBounceSpeed:  0.3,
    hueRotationSpeed:   0.018,
    baseBrightness:     1.2,
    saturation:         1.4,
    shapeHue:           0.15,
    shapeColorSat:      1.0,
    colorMode:          0,
    colorPosterizeLevels: 6,
    colorGradientHue1:  0.66,
    colorGradientHue2:  0.0,
    colorGradientHue3:  0.15,
    polarizationAngle:  0.0,
    polarizationSpeed:  0.0,
    angleLFOEnabled:    0,
    angleLFOWaveform:   0,
    angleLFORate:       0.5,
    angleLFODepth:      0.0,
    osc2Enabled:        0,
    osc2Waveform:       0,
    osc2Frequency:      4.0,
    osc2Angle:          0.0,
    osc2Thickness:      0.5,
    osc2Softness:       0.02,
    osc2PhaseOffset:    0.0,
    osc2Hue:            0.5,
    osc2ColorSat:       1.0,
    osc2BlendMode:      0,
    osc2MovementMode:   5,
    osc2MovementSpeed:  0.5,
    osc2MovementAmplitude: 0.3,
    osc2MovementPhase:  0.0,
    osc2FractalAmount:  0,
    osc2FractalAngle:   0.0,
  },
};
