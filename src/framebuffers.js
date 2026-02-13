/**
 * Ping-pong framebuffer manager.
 *
 * Maintains two FBOs that alternate as read (previous frame) and write
 * (current frame) targets each frame. This is the core technique that
 * enables the feedback loop without read-write conflicts.
 */

/**
 * Create a single framebuffer with an RGBA8 color texture attachment.
 * @param {WebGL2RenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @returns {{ fbo: WebGLFramebuffer, texture: WebGLTexture }}
 */
function createFBO(gl, width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  // Linear filtering gives smooth sub-pixel feedback transforms.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Clamp to edge prevents border artifacts during feedback transforms.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { fbo, texture };
}

/**
 * Destroy a single FBO and its texture.
 * @param {WebGL2RenderingContext} gl
 * @param {{ fbo: WebGLFramebuffer, texture: WebGLTexture }} target
 */
function destroyFBO(gl, target) {
  if (target.texture) gl.deleteTexture(target.texture);
  if (target.fbo) gl.deleteFramebuffer(target.fbo);
}

export class PingPongBuffers {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {number} width
   * @param {number} height
   */
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;

    // targets[0] = read (previous frame), targets[1] = write (current frame)
    this.targets = [
      createFBO(gl, width, height),
      createFBO(gl, width, height),
    ];

    // Index into targets: readIdx is the source, writeIdx is the destination.
    this.readIdx = 0;
    this.writeIdx = 1;
  }

  /** The texture containing the previous frame (read source). */
  get readTexture() {
    return this.targets[this.readIdx].texture;
  }

  /** The framebuffer to render the current frame into (write destination). */
  get writeFBO() {
    return this.targets[this.writeIdx].fbo;
  }

  /** The texture attached to the current write FBO (useful for multi-pass). */
  get writeTexture() {
    return this.targets[this.writeIdx].texture;
  }

  /**
   * Swap read and write roles so the frame just written becomes
   * the read source for the next frame.
   */
  swap() {
    const tmp = this.readIdx;
    this.readIdx = this.writeIdx;
    this.writeIdx = tmp;
  }

  /**
   * Recreate both FBOs at a new resolution. Call this when the canvas resizes.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    if (width === this.width && height === this.height) return;

    const gl = this.gl;

    destroyFBO(gl, this.targets[0]);
    destroyFBO(gl, this.targets[1]);

    this.width = width;
    this.height = height;

    this.targets[0] = createFBO(gl, width, height);
    this.targets[1] = createFBO(gl, width, height);

    this.readIdx = 0;
    this.writeIdx = 1;
  }

  /** Clean up GPU resources. */
  destroy() {
    destroyFBO(this.gl, this.targets[0]);
    destroyFBO(this.gl, this.targets[1]);
  }
}
