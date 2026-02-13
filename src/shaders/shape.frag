#version 300 es
precision highp float;

//
// Shape generator shader (multi-shape SDF).
//
// Generates geometric primitives using signed distance fields.
// Shape type is selected by the uShapeType uniform:
//   0 = Circle   (filled circle with soft edges)
//   1 = Ring     (hollow circle / donut)
//   2 = Line     (rotatable line segment)
//   3 = Cross    (two perpendicular lines)
//   4 = Diamond  (rotated square / L1 norm)
//   5 = Star     (4-pointed star)
//   6 = Triangle (equilateral triangle)
//
// All shapes respect uShapeCenter, uShapeRadius, and uShapeSoftness.
// Outputs colored-on-black for additive blending with the feedback buffer.
// When uShapeColorSat is 0, the output is white (backwards compatible).
//

uniform vec2  uResolution;
uniform vec2  uShapeCenter;        // shape center in normalized [0, 1] coords
uniform float uShapeRadius;        // radius / size in normalized coords
uniform float uShapeSoftness;      // edge softness (smoothstep width)
uniform int   uShapeType;          // shape selector (0-6)
uniform float uShapeRingWidth;     // ring thickness (type 1)
uniform float uShapeLineAngle;     // line rotation in radians (type 2)
uniform float uShapeLineThickness; // line / cross thickness (types 2, 3)
uniform float uShapeHue;           // shape base hue (0-1, HSV)
uniform float uShapeColorSat;      // shape color saturation (0 = white)

in  vec2 vUV;
out vec4 fragColor;

// -------------------------------------------------------------------------
// HSV to RGB conversion
// -------------------------------------------------------------------------

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return v * mix(vec3(1.0), c, s);
}

// -------------------------------------------------------------------------
// SDF functions
// -------------------------------------------------------------------------

// 0: Filled circle
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

// 1: Ring (hollow circle)
float sdRing(vec2 p, float r, float w) {
    return abs(length(p) - r) - w;
}

// 2: Rotatable line segment
float sdLine(vec2 p, float r, float angle, float thickness) {
    // Rotate point by negative angle to align the line with X axis.
    float c = cos(-angle);
    float s = sin(-angle);
    vec2 rp = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    // Infinite line along X axis, clamped to radius for a segment.
    float dx = max(abs(rp.x) - r, 0.0);
    float dy = abs(rp.y) - thickness;
    return max(dy, dx);
}

// 3: Cross (two perpendicular lines)
float sdCross(vec2 p, float r, float thickness) {
    // Distance to axis-aligned cross: min of X-axis line and Y-axis line.
    float d1 = max(abs(p.y) - thickness, abs(p.x) - r);  // horizontal bar
    float d2 = max(abs(p.x) - thickness, abs(p.y) - r);  // vertical bar
    return min(d1, d2);
}

// 4: Diamond (L1 / Manhattan distance = rotated square)
float sdDiamond(vec2 p, float r) {
    return (abs(p.x) + abs(p.y)) - r;
}

// 5: 4-pointed star using polar coordinates
float sdStar(vec2 p, float r) {
    // Use polar modulo to create pointed geometry.
    float a = atan(p.y, p.x);
    float n = 4.0; // number of points
    // Map angle into a wedge.
    float wedge = 3.14159265 / n;
    float sector = mod(a + wedge, 2.0 * wedge) - wedge;
    // Radial distance shaped by cosine of sector angle.
    // Inner radius is about 40% of outer radius for a nice star shape.
    float innerRatio = 0.4;
    float modR = r * mix(innerRatio, 1.0, cos(sector * n * 0.5));
    return length(p) - modR;
}

// 6: Equilateral triangle
float sdTriangle(vec2 p, float r) {
    // Shift down so center of mass is at origin.
    p.y += r * 0.3;
    // Equilateral triangle SDF.
    const float k = 1.73205080757; // sqrt(3)
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) {
        p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    }
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

// -------------------------------------------------------------------------
// Main
// -------------------------------------------------------------------------

void main() {
    // Correct for aspect ratio so shapes stay proportional.
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vUV;
    vec2 center = uShapeCenter;

    // Scale X by aspect ratio to make distance calculations proportional.
    uv.x *= aspect;
    center.x *= aspect;

    // Position relative to shape center.
    vec2 p = uv - center;

    // Evaluate the selected SDF.
    float d;
    if (uShapeType == 1) {
        d = sdRing(p, uShapeRadius, uShapeRingWidth);
    } else if (uShapeType == 2) {
        d = sdLine(p, uShapeRadius, uShapeLineAngle, uShapeLineThickness);
    } else if (uShapeType == 3) {
        d = sdCross(p, uShapeRadius, uShapeLineThickness);
    } else if (uShapeType == 4) {
        d = sdDiamond(p, uShapeRadius);
    } else if (uShapeType == 5) {
        d = sdStar(p, uShapeRadius);
    } else if (uShapeType == 6) {
        d = sdTriangle(p, uShapeRadius);
    } else {
        // Default: circle (type 0 and any out-of-range value).
        d = sdCircle(p, uShapeRadius);
    }

    // Smooth falloff at the edge.
    float shape = 1.0 - smoothstep(0.0, uShapeSoftness, d);

    // Convert shape hue + saturation to RGB. When sat=0 this yields white.
    vec3 shapeColor = hsv2rgb(uShapeHue, uShapeColorSat, 1.0);

    fragColor = vec4(shapeColor * shape, 1.0);
}
