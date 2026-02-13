/**
 * WebGL 2 initialization and utility functions.
 *
 * Provides context creation, shader compilation, program linking,
 * and a fullscreen quad VAO used by every shader pass.
 */

/**
 * Initialize a WebGL 2 rendering context from a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @returns {WebGL2RenderingContext}
 */
export function initGL(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    throw new Error(
      'WebGL 2 is not supported in this browser. ' +
      'Please use a recent version of Chrome, Firefox, or Edge.'
    );
  }

  return gl;
}

/**
 * Compile a single GLSL shader from source.
 * @param {WebGL2RenderingContext} gl
 * @param {number} type  gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source  GLSL source code
 * @returns {WebGLShader}
 */
export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    const typeName = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
    gl.deleteShader(shader);
    throw new Error(`${typeName} shader compilation failed:\n${info}`);
  }

  return shader;
}

/**
 * Link a vertex and fragment shader into a program.
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLShader} vertShader
 * @param {WebGLShader} fragShader
 * @returns {WebGLProgram}
 */
export function linkProgram(gl, vertShader, fragShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Shader program linking failed:\n${info}`);
  }

  return program;
}

/**
 * Convenience: compile vertex + fragment sources and link into a program.
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertSrc
 * @param {string} fragSrc
 * @returns {WebGLProgram}
 */
export function createProgram(gl, vertSrc, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  return linkProgram(gl, vs, fs);
}

/**
 * Create a VAO with a fullscreen triangle (covers the entire clip space).
 *
 * Uses a single oversized triangle instead of a quad to avoid the diagonal
 * seam and save one vertex. The vertex shader generates positions from
 * gl_VertexID so no attribute buffer is needed.
 *
 * @param {WebGL2RenderingContext} gl
 * @returns {WebGLVertexArrayObject}
 */
export function createFullscreenQuadVAO(gl) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  // No buffers needed -- the vertex shader uses gl_VertexID to generate
  // a fullscreen triangle.
  gl.bindVertexArray(null);
  return vao;
}

/**
 * Draw the fullscreen triangle. Bind the quad VAO first, then call this.
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLVertexArrayObject} vao
 */
export function drawFullscreenQuad(gl, vao) {
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

/**
 * Resize the canvas drawing buffer to match its CSS display size.
 * Returns true if the size actually changed (so framebuffers can be recreated).
 * @param {HTMLCanvasElement} canvas
 * @returns {boolean}
 */
export function resizeCanvasToDisplaySize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth  = Math.round(canvas.clientWidth  * dpr);
  const displayHeight = Math.round(canvas.clientHeight * dpr);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
    return true;
  }

  return false;
}
