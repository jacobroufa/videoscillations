#version 300 es
precision highp float;

//
// Feedback transform + decay + hue rotation shader.
//
// Reads the previous frame from the ping-pong buffer and applies:
//   - Rotation (around screen center)
//   - Zoom / scale (from screen center)
//   - X/Y translation
//   - Mirror / kaleidoscope symmetry (conditional on mirrorTarget)
//   - Decay (fade toward black, controlling trail persistence)
//   - Hue rotation (applied to the feedback so each generation of trails
//     gets progressively color-shifted, creating rainbow trails)
//   - Blend mode (controls how decay is applied)
//
// The transformed result is written to the write FBO. The shape pass
// then renders additively on top using GL blending.
//

uniform sampler2D uPrevFrame;
uniform vec2      uResolution;
uniform float     uRotation;     // radians
uniform float     uZoom;         // scale factor (>1 zooms in)
uniform float     uXShift;       // horizontal translation
uniform float     uYShift;       // vertical translation
uniform float     uDecay;        // trail persistence (0..1)
uniform float     uHueShift;     // hue rotation per frame (radians)
uniform int       uMirrorMode;   // 0=none,1=H,2=V,3=quad,4=kal2,5=kal4,6=kal8
uniform float     uKaleidoscopeAngle; // rotation offset for kaleidoscope wedge
uniform int       uMirrorTarget; // 0=feedback,1=shape,2=both,3=output
uniform int       uBlendMode;    // 0=multiply,1=screen,2=soft burn,3=freeze

in  vec2 vUV;
out vec4 fragColor;

const float TAU = 6.28318530718;

// Rodrigues' rotation formula for hue shifting in RGB space.
// Rotates the color vector around the (1,1,1) axis (the luminance axis).
vec3 hueRotate(vec3 color, float shift) {
    vec3 k = vec3(0.57735); // normalized (1,1,1) / sqrt(3)
    float cosA = cos(shift);
    return color * cosA
         + cross(k, color) * sin(shift)
         + k * dot(k, color) * (1.0 - cosA);
}

// Kaleidoscope: fold UV coordinates into a repeating wedge pattern
// with rotational symmetry.
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

// Apply mirror/kaleidoscope symmetry to UV coordinates.
vec2 applyMirror(vec2 uv, int mode, float kalAngle) {
    if (mode == 1) {
        // Horizontal: mirror left half to right.
        uv.x = 0.5 + abs(uv.x - 0.5);
    } else if (mode == 2) {
        // Vertical: mirror top half to bottom.
        uv.y = 0.5 + abs(uv.y - 0.5);
    } else if (mode == 3) {
        // Quad: mirror one quadrant to all four.
        uv = 0.5 + abs(uv - 0.5);
    } else if (mode == 4) {
        // Kaleidoscope 2-fold.
        uv = kaleidoscope(uv, 2, kalAngle);
    } else if (mode == 5) {
        // Kaleidoscope 4-fold.
        uv = kaleidoscope(uv, 4, kalAngle);
    } else if (mode == 6) {
        // Kaleidoscope 8-fold.
        uv = kaleidoscope(uv, 8, kalAngle);
    }
    return uv;
}

void main() {
    // 1. Work in centered coordinates [-0.5, 0.5].
    vec2 centered = vUV - 0.5;

    // 2. Apply rotation around the center.
    float s = sin(uRotation);
    float c = cos(uRotation);
    centered = mat2(c, -s, s, c) * centered;

    // 3. Apply zoom (scale from center). Values > 1 zoom in (trails shrink inward).
    centered *= uZoom;

    // 4. Apply translation.
    centered += vec2(uXShift, uYShift);

    // 5. Back to [0, 1] UV space.
    vec2 sampleUV = centered + 0.5;

    // 6. Apply mirror/kaleidoscope conditionally based on mirrorTarget.
    //    Apply when target is 0 (feedback only) or 2 (both).
    if (uMirrorTarget == 0 || uMirrorTarget == 2) {
        sampleUV = applyMirror(sampleUV, uMirrorMode, uKaleidoscopeAngle);
    }

    // 7. Sample the previous frame with linear filtering for smooth trails.
    vec4 prev = texture(uPrevFrame, sampleUV);

    // 8. Apply hue rotation to the feedback. Each generation of feedback
    //    accumulates more hue shift, creating rainbow color cycling.
    vec3 color = hueRotate(prev.rgb, uHueShift);

    // 9. Apply blend mode / decay.
    if (uBlendMode == 1) {
        // Screen: fades to white.
        fragColor = vec4(1.0 - (1.0 - color) * uDecay, 1.0);
    } else if (uBlendMode == 2) {
        // Soft burn: different fade character.
        fragColor = vec4(pow(color, vec3(1.0 / max(uDecay, 0.01))), 1.0);
    } else if (uBlendMode == 3) {
        // Freeze: trails never fade.
        fragColor = vec4(color, 1.0);
    } else {
        // Mode 0: Multiply (default). Fades to black. Higher uDecay = longer trails.
        fragColor = vec4(color * uDecay, 1.0);
    }
}
