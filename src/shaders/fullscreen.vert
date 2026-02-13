#version 300 es
//
// Fullscreen triangle vertex shader.
//
// Generates a single triangle that covers the entire clip-space quad
// using gl_VertexID (no vertex buffers needed). The triangle extends
// beyond the viewport and is clipped by the GPU -- this is more
// efficient than a two-triangle quad and avoids the diagonal seam.
//
// Vertex 0: (-1, -1)   bottom-left
// Vertex 1: ( 3, -1)   far right
// Vertex 2: (-1,  3)   far top
//

out vec2 vUV;

void main() {
    // Generate clip-space position from vertex index.
    float x = float((gl_VertexID & 1) << 2) - 1.0;  // -1, 3, -1
    float y = float((gl_VertexID & 2) << 1) - 1.0;  // -1, -1, 3

    // UV coordinates: map clip [-1,1] to [0,1].
    vUV = vec2(x, y) * 0.5 + 0.5;

    gl_Position = vec4(x, y, 0.0, 1.0);
}
