#version 300 es
precision highp float;

//
// Display / output shader.
//
// Reads the composited frame (feedback + shape already blended via GL
// hardware blending) and applies final brightness and saturation
// adjustments before outputting to the screen.
//

uniform sampler2D uFrame;        // the composited ping-pong buffer
uniform float     uBrightness;   // overall brightness multiplier
uniform float     uSaturation;   // color saturation (0 = grayscale, 1 = full)

in  vec2 vUV;
out vec4 fragColor;

// Adjust saturation by mixing with luminance.
vec3 adjustSaturation(vec3 color, float sat) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), color, sat);
}

void main() {
    vec3 color = texture(uFrame, vUV).rgb;

    // Adjust saturation.
    color = adjustSaturation(color, uSaturation);

    // Apply brightness.
    color *= uBrightness;

    fragColor = vec4(color, 1.0);
}
