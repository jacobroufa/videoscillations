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
