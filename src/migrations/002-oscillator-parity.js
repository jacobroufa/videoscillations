/**
 * Migration 002: v1 -> v2
 *
 * Oscillator parity refactor: renames Osc1 params from mixed naming
 * (shape*, movement*, polarization*, angleLFO*) to consistent osc1* prefix.
 * Adds new Osc1 params (osc1Enabled, osc1BlendMode) and new Osc2 params
 * (polarization, angle LFO, movement sub-params) for full feature parity.
 */

const RENAME_MAP = {
  // shape* -> osc1*
  shapeWaveform:      'osc1Waveform',
  shapeFrequency:     'osc1Frequency',
  shapeAngle:         'osc1Angle',
  shapeThickness:     'osc1Thickness',
  shapeSoftness:      'osc1Softness',
  shapePhaseOffset:   'osc1PhaseOffset',
  shapeFractalAmount: 'osc1FractalAmount',
  shapeFractalAngle:  'osc1FractalAngle',
  shapeHue:           'osc1Hue',
  shapeColorSat:      'osc1ColorSat',

  // movement* -> osc1Movement*
  movementMode:           'osc1MovementMode',
  movementAmplitude:      'osc1MovementAmplitude',
  movementPhase:          'osc1MovementPhase',
  movementSpeed:          'osc1MovementSpeed',
  movementLissajousRatio: 'osc1MovementLissajousRatio',
  movementSpiralSpeed:    'osc1MovementSpiralSpeed',
  movementScrollAngle:    'osc1MovementScrollAngle',
  movementScrollSpeed:    'osc1MovementScrollSpeed',
  movementBounceSpeed:    'osc1MovementBounceSpeed',

  // polarization* -> osc1Polarization*
  polarizationAngle: 'osc1PolarizationAngle',
  polarizationSpeed: 'osc1PolarizationSpeed',

  // angleLFO* -> osc1AngleLFO*
  angleLFOEnabled:  'osc1AngleLFOEnabled',
  angleLFOWaveform: 'osc1AngleLFOWaveform',
  angleLFORate:     'osc1AngleLFORate',
  angleLFODepth:    'osc1AngleLFODepth',
};

/** New params added to Osc1 (not renamed, genuinely new). */
const NEW_OSC1_DEFAULTS = {
  osc1Enabled:   1,
  osc1BlendMode: 0,
};

/** New params added to Osc2 for feature parity. */
const NEW_OSC2_DEFAULTS = {
  osc2PolarizationAngle:      0.0,
  osc2PolarizationSpeed:      0.0,
  osc2AngleLFOEnabled:        0,
  osc2AngleLFOWaveform:       0,
  osc2AngleLFORate:           0.5,
  osc2AngleLFODepth:          0.0,
  osc2MovementLissajousRatio: 0.5,
  osc2MovementSpiralSpeed:    1.0,
  osc2MovementScrollAngle:    0.0,
  osc2MovementScrollSpeed:    0.5,
  osc2MovementBounceSpeed:    0.3,
};

export default {
  version: 2,
  description: 'Oscillator parity: rename shape/movement/polarization/angleLFO params to osc1* prefix, add osc1Enabled/BlendMode, add osc2 polarization/angleLFO/movement sub-params',
  migrate(preset) {
    const p = preset.params;

    if (p) {
      // 1. Rename existing params.
      for (const [oldKey, newKey] of Object.entries(RENAME_MAP)) {
        if (oldKey in p) {
          p[newKey] = p[oldKey];
          delete p[oldKey];
        }
      }

      // 2. Add new Osc1 params (only if not already present).
      for (const [key, val] of Object.entries(NEW_OSC1_DEFAULTS)) {
        if (!(key in p)) {
          p[key] = val;
        }
      }

      // 3. Add new Osc2 params (only if not already present).
      for (const [key, val] of Object.entries(NEW_OSC2_DEFAULTS)) {
        if (!(key in p)) {
          p[key] = val;
        }
      }
    }

    preset.version = 2;
    return preset;
  }
};
