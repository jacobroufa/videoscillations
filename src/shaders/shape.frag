#version 300 es
precision highp float;

//
// Shape generator shader (circle SDF).
//
// Generates a filled circle using a signed distance field.
// Circle position, radius, and edge softness are driven by
// uniforms that the CPU modulates with time-based oscillators.
//
// Outputs white-on-black so the composite shader can blend it
// additively with the feedback buffer.
//

uniform vec2  uResolution;
uniform vec2  uShapeCenter;     // circle center in normalized [0, 1] coords
uniform float uShapeRadius;     // radius in normalized coords
uniform float uShapeSoftness;   // edge softness (smoothstep width)

in  vec2 vUV;
out vec4 fragColor;

void main() {
    // Correct for aspect ratio so circles stay circular.
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUV;
    vec2 center = uShapeCenter;

    // Scale X by aspect ratio to make distance calculations circular.
    uv.x *= aspect;
    center.x *= aspect;

    // Signed distance from the circle edge (negative inside, positive outside).
    float d = length(uv - center) - uShapeRadius;

    // Smooth falloff at the edge.
    float shape = 1.0 - smoothstep(0.0, uShapeSoftness, d);

    fragColor = vec4(vec3(shape), 1.0);
}
