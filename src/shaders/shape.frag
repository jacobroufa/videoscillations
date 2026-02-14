#version 300 es
precision highp float;

//
// Fullscreen waveform oscillator shape generator.
//
// Replaces the old SDF-based shape generator with fullscreen waveform functions
// inspired by the Sleepy Circuits Hypno hardware. Each waveform type produces
// periodic color bands that span the entire screen. Frequency controls the
// number of repetitions, and phase offset enables scrolling animation.
//
// Supports two independent oscillators with modular blend/routing modes.
//
// Waveform types:
//   0 = Sine     (smooth repeating color bands)
//   1 = Tan      (sawtooth-like sharp bands using fract)
//   2 = Square   (alternating on/off bands)
//   3 = Circle   (concentric rings from center, radial)
//   4 = Diamond  (L1/Manhattan distance rings from center)
//   5 = Triangle (equilateral triangle SDF, tiled)
//
// Outputs colored-on-black for additive blending with the feedback buffer.
//

// -- Osc1 uniforms --------------------------------------------------------
uniform vec2  uResolution;
uniform int   uShapeWaveform;       // waveform type selector (0-5)
uniform float uShapeFrequency;      // repetitions across screen
uniform float uShapeAngle;          // rotation of waveform pattern (radians)
uniform float uShapeThickness;      // duty cycle (0.0-1.0)
uniform float uShapeSoftness;       // edge softness / anti-aliasing width
uniform float uShapePhaseOffset;    // waveform phase offset (X axis / radial)
uniform float uShapePhaseOffsetY;   // waveform phase offset (Y axis, for 2D movement)
uniform int   uShapeFractalAmount;  // 0=off, 1-6 = increasing fold counts
uniform float uShapeFractalAngle;   // fractal mirror axis rotation
uniform float uShapeHue;            // shape base hue (0-1, HSV)
uniform float uShapeColorSat;       // shape color saturation (0 = white)

// -- Polarization ---------------------------------------------------------
uniform float uPolarizationAngle;   // additional UV rotation (0 to 2*PI)

// -- Osc2 uniforms --------------------------------------------------------
uniform int   uOsc2Enabled;         // 0=off, 1=on
uniform int   uOsc2Waveform;        // waveform type selector (0-5)
uniform float uOsc2Frequency;       // repetitions across screen
uniform float uOsc2Angle;           // rotation of waveform pattern (radians)
uniform float uOsc2Thickness;       // duty cycle (0.0-1.0)
uniform float uOsc2Softness;        // edge softness
uniform float uOsc2PhaseOffset;     // waveform phase offset (X axis)
uniform float uOsc2PhaseOffsetY;    // waveform phase offset (Y axis)
uniform int   uOsc2FractalAmount;   // 0=off, 1-6 = increasing fold counts
uniform float uOsc2FractalAngle;    // fractal mirror axis rotation
uniform float uOsc2Hue;             // shape base hue (0-1, HSV)
uniform float uOsc2ColorSat;        // shape color saturation (0 = white)
uniform int   uOsc2BlendMode;       // 0=Add,1=Multiply,2=Mask,3=Difference,4=Phase Mod

// Mirror uniforms (shared with feedback.frag and composite.frag)
uniform int   uMirrorMode;          // 0=none,1=H,2=V,3=quad,4=kal2,5=kal4,6=kal8
uniform float uKaleidoscopeAngle;   // rotation offset for kaleidoscope wedge
uniform int   uMirrorTarget;        // 0=feedback,1=shape,2=both,3=output

in  vec2 vUV;
out vec4 fragColor;

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

// -------------------------------------------------------------------------
// HSV to RGB conversion
// -------------------------------------------------------------------------

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return v * mix(vec3(1.0), c, s);
}

// -------------------------------------------------------------------------
// Mirror / kaleidoscope functions (identical to feedback.frag)
// -------------------------------------------------------------------------

vec2 kaleidoscope(vec2 uv, int segments, float angleOffset) {
    vec2 centered = uv - 0.5;
    float angle = atan(centered.y, centered.x) + angleOffset;
    float radius = length(centered);
    float wedge = TAU / float(segments);
    angle = mod(angle, wedge);
    if (angle > wedge * 0.5) {
        angle = wedge - angle;
    }
    centered = vec2(cos(angle), sin(angle)) * radius;
    return centered + 0.5;
}

vec2 applyMirror(vec2 uv, int mode, float kalAngle) {
    if (mode == 1) {
        uv.x = 0.5 + abs(uv.x - 0.5);
    } else if (mode == 2) {
        uv.y = 0.5 + abs(uv.y - 0.5);
    } else if (mode == 3) {
        uv = 0.5 + abs(uv - 0.5);
    } else if (mode == 4) {
        uv = kaleidoscope(uv, 2, kalAngle);
    } else if (mode == 5) {
        uv = kaleidoscope(uv, 4, kalAngle);
    } else if (mode == 6) {
        uv = kaleidoscope(uv, 8, kalAngle);
    }
    return uv;
}

// -------------------------------------------------------------------------
// Fractalization -- recursive mirror folds for n-fold symmetry
// -------------------------------------------------------------------------

vec2 applyFractal(vec2 uv, int amount, float fracAngle) {
    if (amount <= 0) return uv;

    // Map amount 1-6 to fold counts: 1,2,4,6,8,12
    int folds;
    if (amount == 1) folds = 1;
    else if (amount == 2) folds = 2;
    else if (amount == 3) folds = 4;
    else if (amount == 4) folds = 8;
    else if (amount == 5) folds = 12;
    else folds = 16;

    // Center UV around (0.5, 0.5)
    vec2 centered = uv - 0.5;

    // Convert to polar
    float angle = atan(centered.y, centered.x) + fracAngle;
    float radius = length(centered);

    // Fold the angle into a wedge
    float wedgeSize = TAU / float(folds);
    angle = mod(angle, wedgeSize);
    // Mirror within the wedge
    if (angle > wedgeSize * 0.5) {
        angle = wedgeSize - angle;
    }

    // Convert back to Cartesian
    centered = vec2(cos(angle), sin(angle)) * radius;
    return centered + 0.5;
}

// -------------------------------------------------------------------------
// Rotate UV around center by angle
// -------------------------------------------------------------------------

vec2 rotateUV(vec2 uv, float angle) {
    vec2 centered = uv - 0.5;
    float s = sin(angle);
    float c = cos(angle);
    centered = mat2(c, -s, s, c) * centered;
    return centered + 0.5;
}

// -------------------------------------------------------------------------
// Waveform evaluation functions
// Each returns a value in [0, 1] representing the brightness of the band.
// -------------------------------------------------------------------------

// Evaluate waveform and apply duty cycle (thickness) and softness.
// `t` is the raw coordinate value (already scaled by frequency + phase).
// Returns brightness in [0, 1].
float evaluateWaveform(int waveform, float t, float thickness, float softness) {
    float wave;

    if (waveform == 1) {
        // Tan/Sawtooth: sharp ramp using fract
        wave = fract(t);
    } else if (waveform == 2) {
        // Square: hard on/off binary bands.
        // Use smoothstep around the thickness threshold for controllable edge softness.
        float f = fract(t);
        float halfSoft = max(softness, 0.001);
        return smoothstep(thickness - halfSoft, thickness + halfSoft, f);
    } else {
        // Sine (default, also used as fallback)
        // Map sin output from [-1,1] to [0,1]
        wave = sin(t * TAU) * 0.5 + 0.5;
    }

    // Apply duty cycle (thickness) and softness.
    // thickness = 0.5 means equal bright/dark bands.
    // thickness = 0.1 means thin bright lines with wide dark gaps.
    // thickness = 0.9 means wide bright bars with thin dark gaps.
    float halfSoft = max(softness, 0.001);
    float result = smoothstep(1.0 - thickness - halfSoft, 1.0 - thickness + halfSoft, wave);

    return result;
}

// -------------------------------------------------------------------------
// Equilateral triangle SDF for tiling
// -------------------------------------------------------------------------

float sdTriangleTiled(vec2 p, float freq) {
    // Tile the space
    p *= freq;
    // Create a repeating tile using the triangle grid
    // Offset every other row
    float row = floor(p.y * 2.0 / sqrt(3.0));
    float col = floor(p.x - mod(row, 2.0) * 0.5);
    // Center within tile
    vec2 tileCenter = vec2(col + mod(row, 2.0) * 0.5 + 0.5, (row + 0.5) * sqrt(3.0) * 0.5);
    vec2 local = p - tileCenter;

    // Equilateral triangle SDF
    const float k = 1.73205080757; // sqrt(3)
    float r = 0.45; // half-size of triangle within tile
    local.y += r * 0.3;
    local.x = abs(local.x) - r;
    local.y = local.y + r / k;
    if (local.x + k * local.y > 0.0) {
        local = vec2(local.x - k * local.y, -k * local.x - local.y) / 2.0;
    }
    local.x -= clamp(local.x, -2.0 * r, 0.0);
    return -length(local) * sign(local.y);
}

// -------------------------------------------------------------------------
// Evaluate a single oscillator given prepared UV and parameters.
// Returns brightness in [0, 1].
// -------------------------------------------------------------------------

float evaluateOscillator(vec2 uv, float aspect, int waveform, float frequency,
                         float thickness, float softness) {
    float shape = 0.0;

    if (waveform == 3) {
        // Circle: concentric rings from screen center.
        vec2 centered = uv - 0.5;
        centered.x *= aspect;
        float dist = length(centered);
        float t = dist * frequency;
        float wave = sin(t * TAU) * 0.5 + 0.5;
        float halfSoft = max(softness, 0.001);
        shape = smoothstep(1.0 - thickness - halfSoft, 1.0 - thickness + halfSoft, wave);

    } else if (waveform == 4) {
        // Diamond: L1/Manhattan distance concentric rings from center.
        vec2 centered = uv - 0.5;
        centered.x *= aspect;
        float dist = abs(centered.x) + abs(centered.y);
        float t = dist * frequency;
        float wave = sin(t * TAU) * 0.5 + 0.5;
        float halfSoft = max(softness, 0.001);
        shape = smoothstep(1.0 - thickness - halfSoft, 1.0 - thickness + halfSoft, wave);

    } else if (waveform == 5) {
        // Triangle: tiled equilateral triangles.
        vec2 triUV = uv;
        triUV.x *= aspect;
        float d = sdTriangleTiled(triUV - vec2(aspect * 0.5, 0.5), frequency);
        float halfSoft = max(softness, 0.001);
        shape = 1.0 - smoothstep(-halfSoft, halfSoft, d);

    } else {
        // Linear waveforms (Sine=0, Tan=1, Square=2).
        float coord = (uv.x - 0.5) * aspect;
        float t = coord * frequency;
        shape = evaluateWaveform(waveform, t, thickness, softness);
    }

    return shape;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

void main() {
    vec2 uv = vUV;

    // Apply mirror to shape UV if mirrorTarget includes shape (1 or 2).
    if (uMirrorTarget == 1 || uMirrorTarget == 2) {
        uv = applyMirror(uv, uMirrorMode, uKaleidoscopeAngle);
    }

    // Correct for aspect ratio (used by both oscillators).
    float aspect = uResolution.x / uResolution.y;

    // ------------------------------------------------------------------
    // Oscillator 2 evaluation (evaluated first for Phase Mod routing)
    // ------------------------------------------------------------------
    float osc2Shape = 0.0;
    vec3 osc2Color = vec3(0.0);

    if (uOsc2Enabled == 1) {
        vec2 uv2 = uv;

        // Apply Osc2 fractalization.
        uv2 = applyFractal(uv2, uOsc2FractalAmount, uOsc2FractalAngle);

        // Apply Osc2 2D phase offset.
        uv2.x += uOsc2PhaseOffset;
        uv2.y += uOsc2PhaseOffsetY;

        // Apply Osc2 rotation (angle).
        uv2 = rotateUV(uv2, uOsc2Angle);

        // Evaluate Osc2 waveform.
        osc2Shape = evaluateOscillator(uv2, aspect, uOsc2Waveform, uOsc2Frequency,
                                        uOsc2Thickness, uOsc2Softness);

        // Osc2 color.
        osc2Color = hsv2rgb(uOsc2Hue, uOsc2ColorSat, 1.0);
    }

    // ------------------------------------------------------------------
    // Oscillator 1 evaluation
    // ------------------------------------------------------------------
    vec2 uv1 = uv;

    // Apply Osc1 fractalization before waveform evaluation.
    uv1 = applyFractal(uv1, uShapeFractalAmount, uShapeFractalAngle);

    // Apply polarization rotation (separate spatial transform from shapeAngle).
    uv1 = rotateUV(uv1, uPolarizationAngle);

    // Apply 2D phase offset as UV translation BEFORE rotation.
    float osc1PhaseX = uShapePhaseOffset;
    float osc1PhaseY = uShapePhaseOffsetY;

    // Phase Mod: Osc2's brightness modulates Osc1's phase input.
    if (uOsc2Enabled == 1 && uOsc2BlendMode == 4) {
        osc1PhaseX += osc2Shape * 0.5; // scale for usable FM depth
    }

    uv1.x += osc1PhaseX;
    uv1.y += osc1PhaseY;

    // Apply Osc1 rotation around center.
    uv1 = rotateUV(uv1, uShapeAngle);

    // Evaluate Osc1 waveform.
    float osc1Shape = evaluateOscillator(uv1, aspect, uShapeWaveform, uShapeFrequency,
                                          uShapeThickness, uShapeSoftness);

    // Osc1 color.
    vec3 osc1Color = hsv2rgb(uShapeHue, uShapeColorSat, 1.0);

    // ------------------------------------------------------------------
    // Combine oscillators
    // ------------------------------------------------------------------
    vec3 finalColor;

    if (uOsc2Enabled == 0) {
        // Only Osc1 active.
        finalColor = osc1Color * osc1Shape;
    } else if (uOsc2BlendMode == 0) {
        // Add: both oscillators contribute light independently.
        finalColor = osc1Color * osc1Shape + osc2Color * osc2Shape;
    } else if (uOsc2BlendMode == 1) {
        // Multiply: Osc2 modulates Osc1's brightness (ring mod / AM).
        finalColor = osc1Color * osc1Shape * osc2Shape;
    } else if (uOsc2BlendMode == 2) {
        // Mask: Osc1 only shows where Osc2 is bright (stencil).
        finalColor = osc1Color * osc1Shape * step(0.01, osc2Shape);
    } else if (uOsc2BlendMode == 3) {
        // Difference: absolute difference creates interference patterns.
        vec3 c1 = osc1Color * osc1Shape;
        vec3 c2 = osc2Color * osc2Shape;
        finalColor = abs(c1 - c2);
    } else {
        // Phase Mod (mode 4): Osc2 already routed into Osc1's phase above.
        // Output Osc1 only (the modulated result).
        finalColor = osc1Color * osc1Shape;
    }

    fragColor = vec4(finalColor, 1.0);
}
