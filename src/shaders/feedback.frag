#version 300 es
precision highp float;

//
// Feedback transform + decay + hue rotation shader.
//
// Reads the previous frame from the ping-pong buffer and applies:
//   - Rotation (around screen center)
//   - Zoom / scale (from screen center)
//   - X/Y translation
//   - Decay (fade toward black, controlling trail persistence)
//   - Hue rotation (applied to the feedback so each generation of trails
//     gets progressively color-shifted, creating rainbow trails)
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

in  vec2 vUV;
out vec4 fragColor;

// Rodrigues' rotation formula for hue shifting in RGB space.
// Rotates the color vector around the (1,1,1) axis (the luminance axis).
vec3 hueRotate(vec3 color, float shift) {
    vec3 k = vec3(0.57735); // normalized (1,1,1) / sqrt(3)
    float cosA = cos(shift);
    return color * cosA
         + cross(k, color) * sin(shift)
         + k * dot(k, color) * (1.0 - cosA);
}

void main() {
    // Work in centered coordinates [-0.5, 0.5].
    vec2 centered = vUV - 0.5;

    // Apply rotation around the center.
    float s = sin(uRotation);
    float c = cos(uRotation);
    centered = mat2(c, -s, s, c) * centered;

    // Apply zoom (scale from center). Values > 1 zoom in (trails shrink inward).
    centered *= uZoom;

    // Apply translation.
    centered += vec2(uXShift, uYShift);

    // Back to [0, 1] UV space.
    vec2 sampleUV = centered + 0.5;

    // Sample the previous frame with linear filtering for smooth trails.
    vec4 prev = texture(uPrevFrame, sampleUV);

    // Apply hue rotation to the feedback. Each generation of feedback
    // accumulates more hue shift, creating rainbow color cycling.
    vec3 color = hueRotate(prev.rgb, uHueShift);

    // Decay: blend toward black. Higher uDecay = longer trails.
    fragColor = vec4(color * uDecay, 1.0);
}
