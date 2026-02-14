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
 *
 * Movement modes drive the shapePhaseOffset for fullscreen waveform scrolling:
 *   0 = Sine oscillation of phase
 *   1 = Lissajous (sine with phase offset)
 *   2 = Spiral (phase + angle animation for radial waveforms)
 *   3 = Scroll (continuous phase increment)
 *   4 = Bounce (phase bounces between limits)
 *   5 = Fixed (no phase animation)
 */

import { drawFullscreenQuad } from './gl.js';

const TAU = Math.PI * 2;

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

    // Bounce mode internal state.
    this._bouncePhase = 0.0;
    this._bounceDir = 1.0;
    this._lastTime = 0;
  }

  /**
   * Start the render loop.
   * @param {object} params  -- the live params object (mutated externally)
   */
  start(params) {
    this._running = true;
    this._params = params;
    this._startTime = performance.now();
    this._lastTime = this._startTime;

    // Reset bounce state.
    this._bouncePhase = 0.0;
    this._bounceDir = 1.0;

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
    const dt = (now - this._lastTime) / 1000;       // delta time for bounce
    this._lastTime = now;

    const width  = gl.canvas.width;
    const height = gl.canvas.height;

    // ------------------------------------------------------------------
    // Compute phase offset from movement mode.
    // Movement drives waveform scrolling via phase offset animation.
    // ------------------------------------------------------------------
    let phaseOffset = p.shapePhaseOffset;
    let angleOffset = p.shapeAngle;
    const amp = p.movementAmplitude;
    const speed = p.movementSpeed;

    switch (p.movementMode) {
      case 1: {
        // Lissajous: sinusoidal phase oscillation with phase offset.
        phaseOffset += amp * Math.sin(elapsed * speed * TAU + p.movementPhase);
        break;
      }
      case 2: {
        // Spiral: for radial waveforms, animate both phase and angle.
        // Phase scrolls outward, angle rotates.
        phaseOffset += elapsed * speed * amp;
        angleOffset += elapsed * p.movementSpiralSpeed;
        break;
      }
      case 3: {
        // Scroll: continuous phase increment at constant speed.
        // Direction determined by movementScrollAngle mapped to phase.
        const scrollRate = p.movementScrollSpeed;
        phaseOffset += elapsed * scrollRate;
        break;
      }
      case 4: {
        // Bounce: phase oscillates between -amp and +amp, bouncing at edges.
        const bounceSpeed = p.movementBounceSpeed;
        this._bouncePhase += this._bounceDir * bounceSpeed * dt;
        if (this._bouncePhase > amp) {
          this._bouncePhase = amp - (this._bouncePhase - amp);
          this._bounceDir = -1.0;
        }
        if (this._bouncePhase < -amp) {
          this._bouncePhase = -amp - (this._bouncePhase + amp);
          this._bounceDir = 1.0;
        }
        phaseOffset += this._bouncePhase;
        break;
      }
      case 5:
        // Fixed: no phase animation.
        break;
      default: {
        // Mode 0: Sine oscillation of phase.
        phaseOffset += amp * Math.sin(elapsed * speed * TAU);
        break;
      }
    }

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
    gl.uniform1i(fb.uMirrorMode, p.mirrorMode);
    gl.uniform1f(fb.uKaleidoscopeAngle, p.kaleidoscopeAngle);
    gl.uniform1i(fb.uMirrorTarget, p.mirrorTarget);
    gl.uniform1i(fb.uBlendMode, p.feedbackBlendMode);

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
    gl.uniform1i(sh.uShapeWaveform, p.shapeWaveform);
    gl.uniform1f(sh.uShapeFrequency, p.shapeFrequency);
    gl.uniform1f(sh.uShapeAngle, angleOffset);
    gl.uniform1f(sh.uShapeThickness, p.shapeThickness);
    gl.uniform1f(sh.uShapeSoftness, p.shapeSoftness);
    gl.uniform1f(sh.uShapePhaseOffset, phaseOffset);
    gl.uniform1i(sh.uShapeFractalAmount, p.shapeFractalAmount);
    gl.uniform1f(sh.uShapeFractalAngle, p.shapeFractalAngle);
    gl.uniform1f(sh.uShapeHue, p.shapeHue);
    gl.uniform1f(sh.uShapeColorSat, p.shapeColorSat);
    gl.uniform1i(sh.uMirrorMode, p.mirrorMode);
    gl.uniform1f(sh.uKaleidoscopeAngle, p.kaleidoscopeAngle);
    gl.uniform1i(sh.uMirrorTarget, p.mirrorTarget);

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
    gl.uniform1i(dp.uColorMode, p.colorMode);
    gl.uniform1f(dp.uPosterizeLevels, p.colorPosterizeLevels);
    gl.uniform1f(dp.uGradientHue1, p.colorGradientHue1);
    gl.uniform1f(dp.uGradientHue2, p.colorGradientHue2);
    gl.uniform1f(dp.uGradientHue3, p.colorGradientHue3);
    gl.uniform1i(dp.uMirrorMode, p.mirrorMode);
    gl.uniform1f(dp.uKaleidoscopeAngle, p.kaleidoscopeAngle);
    gl.uniform1i(dp.uMirrorTarget, p.mirrorTarget);

    drawFullscreenQuad(gl, this.quadVAO);

    // ------------------------------------------------------------------
    // Swap ping-pong buffers for next frame.
    // Next frame reads from what we just wrote (the composite result).
    // ------------------------------------------------------------------
    this.pingPong.swap();

    this._rafId = requestAnimationFrame(this._tick);
  }
}
