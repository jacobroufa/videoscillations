/**
 * Render loop orchestration.
 *
 * Manages the per-frame render pipeline:
 *   1. Feedback pass  -- read previous frame, apply transforms + decay + hue
 *   2. Shape pass     -- render shape additively on top of feedback using GL blending
 *   3. Display pass   -- blit the result to the screen with brightness/saturation
 *   4. Swap           -- flip ping-pong buffers for next frame
 *
 * The shape is blended onto the feedback buffer using hardware additive
 * blending (gl.blendFunc(ONE, ONE)) rather than a shader-based composite.
 * This avoids the read-write conflict that would occur if we tried to
 * sample and render to the same FBO in a single shader pass.
 */

import { drawFullscreenQuad } from './gl.js';

export class Renderer {
  /**
   * @param {WebGL2RenderingContext} gl
   * @param {object} programs        -- { feedback, shape, display }
   * @param {object} uniforms        -- maps of uniform locations per program
   * @param {import('./framebuffers.js').PingPongBuffers} pingPong
   * @param {WebGLVertexArrayObject} quadVAO
   */
  constructor(gl, programs, uniforms, pingPong, quadVAO) {
    this.gl = gl;
    this.programs = programs;
    this.uniforms = uniforms;
    this.pingPong = pingPong;
    this.quadVAO = quadVAO;

    this._rafId = 0;
    this._running = false;
    this._startTime = performance.now();
  }

  /**
   * Start the render loop.
   * @param {object} params  -- the live params object (mutated externally)
   */
  start(params) {
    this._running = true;
    this._params = params;
    this._startTime = performance.now();
    this._tick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._tick);
  }

  /** Stop the render loop. */
  stop() {
    this._running = false;
    cancelAnimationFrame(this._rafId);
  }

  /** @private */
  _tick(now) {
    if (!this._running) return;

    const gl = this.gl;
    const p = this._params;
    const elapsed = (now - this._startTime) / 1000; // seconds

    const width  = gl.canvas.width;
    const height = gl.canvas.height;

    // ------------------------------------------------------------------
    // Pass 1: Feedback
    //   Read from pingPong.read (previous frame)
    //   Write to pingPong.write
    //   Applies rotation, zoom, translation, decay, and hue rotation.
    // ------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPong.writeFBO);
    gl.viewport(0, 0, width, height);

    gl.useProgram(this.programs.feedback);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pingPong.readTexture);

    const fb = this.uniforms.feedback;
    gl.uniform1i(fb.uPrevFrame, 0);
    gl.uniform2f(fb.uResolution, width, height);
    gl.uniform1f(fb.uRotation, p.feedbackRotation);
    gl.uniform1f(fb.uZoom, p.feedbackZoom);
    gl.uniform1f(fb.uXShift, p.feedbackXShift);
    gl.uniform1f(fb.uYShift, p.feedbackYShift);
    gl.uniform1f(fb.uDecay, p.feedbackDecay);
    gl.uniform1f(fb.uHueShift, p.hueRotationSpeed);

    gl.disable(gl.BLEND);
    drawFullscreenQuad(gl, this.quadVAO);

    // ------------------------------------------------------------------
    // Pass 2: Shape (additive blend onto the feedback result)
    //   Still writing to pingPong.write (same FBO as pass 1 output).
    //   Uses GL hardware additive blending so we don't need to read
    //   the FBO contents in the shader -- avoiding the read-write conflict.
    // ------------------------------------------------------------------
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // additive: src + dst

    gl.useProgram(this.programs.shape);

    const sh = this.uniforms.shape;
    gl.uniform2f(sh.uResolution, width, height);

    // Oscillate shape position using sine waves.
    const cx = 0.5 + 0.3 * Math.sin(elapsed * p.shapeFreqX * Math.PI * 2);
    const cy = 0.5 + 0.3 * Math.sin(elapsed * p.shapeFreqY * Math.PI * 2);
    gl.uniform2f(sh.uShapeCenter, cx, cy);

    // Modulate radius.
    const radius = p.shapeRadius
      + p.shapeRadiusModAmt * Math.sin(elapsed * p.shapeRadiusModFreq * Math.PI * 2);
    gl.uniform1f(sh.uShapeRadius, Math.max(0.001, radius));
    gl.uniform1f(sh.uShapeSoftness, p.shapeSoftness);

    drawFullscreenQuad(gl, this.quadVAO);

    gl.disable(gl.BLEND);

    // ------------------------------------------------------------------
    // Pass 3: Display
    //   Read from pingPong.write (feedback + shape composited)
    //   Write to screen (default framebuffer)
    //   Applies brightness and saturation adjustments.
    // ------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);

    gl.useProgram(this.programs.display);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.pingPong.writeTexture);

    const dp = this.uniforms.display;
    gl.uniform1i(dp.uFrame, 0);
    gl.uniform1f(dp.uBrightness, p.baseBrightness);
    gl.uniform1f(dp.uSaturation, p.saturation);

    drawFullscreenQuad(gl, this.quadVAO);

    // ------------------------------------------------------------------
    // Swap ping-pong buffers for next frame.
    // Next frame reads from what we just wrote (the composite result).
    // ------------------------------------------------------------------
    this.pingPong.swap();

    this._rafId = requestAnimationFrame(this._tick);
  }
}
