#version 300 es
precision highp float;

//
// Display / output shader.
//
// Reads the composited frame (feedback + shape already blended via GL
// hardware blending) and applies color mode processing, optional mirror
// (when mirrorTarget=3, output mode), then final brightness and saturation
// adjustments before outputting to the screen.
//
// Color modes:
//   0 - Direct     (original behavior: just brightness + saturation)
//   1 - Gradient   (map luminance to 3-stop hue gradient)
//   2 - Posterize  (quantize color to N discrete levels)
//   3 - Negative   (invert colors)
//   4 - Thermal    (map luminance to thermal/heat palette)
//

uniform sampler2D uFrame;        // the composited ping-pong buffer
uniform float     uBrightness;   // overall brightness multiplier
uniform float     uSaturation;   // color saturation (0 = grayscale, 1 = full)
uniform int       uColorMode;    // color mode selector (0-4)
uniform float     uPosterizeLevels; // posterize: number of discrete levels
uniform float     uGradientHue1; // gradient: dark-end hue
uniform float     uGradientHue2; // gradient: mid hue
uniform float     uGradientHue3; // gradient: bright-end hue

// Mirror uniforms for output mode (mirrorTarget=3)
uniform int       uMirrorMode;          // 0=none,1=H,2=V,3=quad,4=kal2,5=kal4,6=kal8
uniform float     uKaleidoscopeAngle;   // rotation offset for kaleidoscope wedge
uniform int       uMirrorTarget;        // 0=feedback,1=shape,2=both,3=output

in  vec2 vUV;
out vec4 fragColor;

const float TAU = 6.28318530718;

// -------------------------------------------------------------------------
// Utility functions
// -------------------------------------------------------------------------

// Adjust saturation by mixing with luminance.
vec3 adjustSaturation(vec3 color, float sat) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), color, sat);
}

// HSV to RGB conversion.
vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return v * mix(vec3(1.0), c, s);
}

// Luminance of an RGB color.
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// -------------------------------------------------------------------------
// Mirror / kaleidoscope functions (identical to feedback.frag and shape.frag)
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
// Color mode functions
// -------------------------------------------------------------------------

// Mode 1: Gradient map -- map luminance to a 3-stop color gradient.
vec3 gradientMap(vec3 color, float h1, float h2, float h3) {
    float luma = luminance(color);
    // Three color stops at luma = 0.0 (dark), 0.5 (mid), 1.0 (bright).
    vec3 c1 = hsv2rgb(h1, 1.0, 1.0); // dark color
    vec3 c2 = hsv2rgb(h2, 1.0, 1.0); // mid color
    vec3 c3 = hsv2rgb(h3, 1.0, 1.0); // bright color
    // Interpolate between the three stops.
    vec3 result = mix(c1, c2, smoothstep(0.0, 0.5, luma));
    result = mix(result, c3, smoothstep(0.5, 1.0, luma));
    // Scale by original luminance to preserve brightness variation.
    return result * luma;
}

// Mode 2: Posterize -- quantize color to discrete levels.
vec3 posterize(vec3 color, float levels) {
    return floor(color * levels + 0.5) / levels;
}

// Mode 3: Negative -- invert colors.
vec3 negative(vec3 color) {
    return 1.0 - color;
}

// Mode 4: Thermal -- map luminance to thermal/heat camera palette.
vec3 thermal(float t) {
    vec3 c = vec3(0.0);
    c = mix(c, vec3(0.0, 0.0, 1.0), smoothstep(0.0, 0.25, t));
    c = mix(c, vec3(1.0, 0.0, 0.0), smoothstep(0.25, 0.5, t));
    c = mix(c, vec3(1.0, 1.0, 0.0), smoothstep(0.5, 0.75, t));
    c = mix(c, vec3(1.0, 1.0, 1.0), smoothstep(0.75, 1.0, t));
    return c;
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

void main() {
    vec2 uv = vUV;

    // Apply mirror in output mode (mirrorTarget=3).
    if (uMirrorTarget == 3) {
        uv = applyMirror(uv, uMirrorMode, uKaleidoscopeAngle);
    }

    vec3 color = texture(uFrame, uv).rgb;

    // Apply color mode processing before brightness/saturation.
    if (uColorMode == 1) {
        // Gradient map
        color = gradientMap(color, uGradientHue1, uGradientHue2, uGradientHue3);
    } else if (uColorMode == 2) {
        // Posterize
        color = posterize(color, uPosterizeLevels);
    } else if (uColorMode == 3) {
        // Negative
        color = negative(color);
    } else if (uColorMode == 4) {
        // Thermal
        float luma = luminance(color);
        color = thermal(luma);
    }
    // Mode 0 (Direct): no processing, color passes through as-is.

    // Adjust saturation.
    color = adjustSaturation(color, uSaturation);

    // Apply brightness.
    color *= uBrightness;

    fragColor = vec4(color, 1.0);
}
