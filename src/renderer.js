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

    // Bounce mode internal state (Osc1).
    this._bouncePhase = 0.0;
    this._bounceDir = 1.0;
    this._lastTime = 0;

    // Bounce mode internal state (Osc2).
    this._osc2BouncePhase = 0.0;
    this._osc2BounceDir = 1.0;

    // Angle LFO internal state.
    this._angleLFOLastSH = 0.0;       // Random S&H: last held value
    this._angleLFOLastSHTime = 0.0;   // Random S&H: time of last sample
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

    // Reset Osc2 bounce state.
    this._osc2BouncePhase = 0.0;
    this._osc2BounceDir = 1.0;

    // Reset angle LFO state.
    this._angleLFOLastSH = 0.0;
    this._angleLFOLastSHTime = 0.0;

    this._tick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._tick);
  }

  /** Stop the render loop. */
  stop() {
    this._running = false;
    cancelAnimationFrame(this._rafId);
  }

  // ------------------------------------------------------------------
  // Compute movement phase offsets for a given movement mode and params.
  // Returns { phaseX, phaseY, angleOffset }.
  // ------------------------------------------------------------------
  _computeMovement(movementMode, elapsed, dt, basePhaseOffset, baseAngle, opts) {
    let phaseOffsetX = basePhaseOffset;
    let phaseOffsetY = 0.0;
    let angleOffset = baseAngle;

    const amp = opts.amplitude;
    const speed = opts.speed;

    switch (movementMode) {
      case 1: {
        // Lissajous: two independent sinusoidal oscillations on X and Y.
        const ratio = opts.lissajousRatio || 0.5;
        const phase = opts.phase || 0.0;
        phaseOffsetX += amp * Math.sin(elapsed * speed * TAU);
        phaseOffsetY += amp * Math.sin(elapsed * speed * TAU * ratio + phase);
        break;
      }
      case 2: {
        // Spiral: animate both phase and angle.
        phaseOffsetX += elapsed * speed * amp;
        angleOffset += elapsed * (opts.spiralSpeed || 1.0);
        break;
      }
      case 3: {
        // Scroll: continuous phase increment in a direction.
        const scrollRate = opts.scrollSpeed || 0.5;
        const scrollAngle = opts.scrollAngle || 0.0;
        phaseOffsetX += elapsed * scrollRate * Math.cos(scrollAngle);
        phaseOffsetY += elapsed * scrollRate * Math.sin(scrollAngle);
        break;
      }
      case 4: {
        // Bounce: phase oscillates between -amp and +amp.
        const bounceSpeed = opts.bounceSpeed || 0.3;
        const bounce = opts.bounceState;
        bounce.phase += bounce.dir * bounceSpeed * dt;
        if (bounce.phase > amp) {
          bounce.phase = amp - (bounce.phase - amp);
          bounce.dir = -1.0;
        }
        if (bounce.phase < -amp) {
          bounce.phase = -amp - (bounce.phase + amp);
          bounce.dir = 1.0;
        }
        phaseOffsetX += bounce.phase;
        break;
      }
      case 5:
        // Fixed: no phase animation.
        break;
      default: {
        // Mode 0: Sine oscillation of phase (1D).
        phaseOffsetX += amp * Math.sin(elapsed * speed * TAU);
        break;
      }
    }

    return { phaseX: phaseOffsetX, phaseY: phaseOffsetY, angleOffset };
  }

  // ------------------------------------------------------------------
  // Compute angle LFO modulation value.
  // ------------------------------------------------------------------
  _computeAngleLFO(elapsed, p) {
    if (!p.angleLFOEnabled) return 0.0;

    const rate = p.angleLFORate;
    const depth = p.angleLFODepth;
    const phase = elapsed * rate * TAU;

    let lfoValue = 0.0;

    switch (p.angleLFOWaveform) {
      case 0:
        // Sine
        lfoValue = Math.sin(phase);
        break;
      case 1:
        // Triangle
        lfoValue = (2.0 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case 2:
        // Sawtooth: goes from -1 to 1 linearly
        lfoValue = 2.0 * ((elapsed * rate) % 1.0) - 1.0;
        break;
      case 3:
        // Square
        lfoValue = Math.sin(phase) >= 0.0 ? 1.0 : -1.0;
        break;
      case 4: {
        // Random Sample & Hold: hold a random value for each LFO period
        const period = 1.0 / Math.max(rate, 0.001);
        const currentPeriod = Math.floor(elapsed / period);
        const lastPeriod = Math.floor(this._angleLFOLastSHTime / period);
        if (currentPeriod !== lastPeriod || this._angleLFOLastSHTime === 0) {
          this._angleLFOLastSH = Math.random() * 2.0 - 1.0;
          this._angleLFOLastSHTime = elapsed;
        }
        lfoValue = this._angleLFOLastSH;
        break;
      }
      default:
        lfoValue = Math.sin(phase);
    }

    return lfoValue * depth;
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
    // Compute Osc1 phase offset from movement mode.
    // ------------------------------------------------------------------
    const osc1Bounce = { phase: this._bouncePhase, dir: this._bounceDir };
    const osc1Movement = this._computeMovement(p.movementMode, elapsed, dt,
      p.shapePhaseOffset, p.shapeAngle, {
        amplitude: p.movementAmplitude,
        speed: p.movementSpeed,
        lissajousRatio: p.movementLissajousRatio,
        phase: p.movementPhase,
        spiralSpeed: p.movementSpiralSpeed,
        scrollAngle: p.movementScrollAngle,
        scrollSpeed: p.movementScrollSpeed,
        bounceSpeed: p.movementBounceSpeed,
        bounceState: osc1Bounce,
      });

    // Persist Osc1 bounce state (mutated by reference in _computeMovement).
    this._bouncePhase = osc1Bounce.phase;
    this._bounceDir = osc1Bounce.dir;

    const phaseOffsetX = osc1Movement.phaseX;
    const phaseOffsetY = osc1Movement.phaseY;
    let angleOffset = osc1Movement.angleOffset;

    // ------------------------------------------------------------------
    // Compute angle LFO modulation.
    // ------------------------------------------------------------------
    angleOffset += this._computeAngleLFO(elapsed, p);

    // ------------------------------------------------------------------
    // Compute polarization auto-rotation.
    // ------------------------------------------------------------------
    let polarizationAngle = p.polarizationAngle;
    if (p.polarizationSpeed !== 0.0) {
      polarizationAngle += elapsed * p.polarizationSpeed;
    }

    // ------------------------------------------------------------------
    // Compute Osc2 phase offset from its own movement mode.
    // ------------------------------------------------------------------
    let osc2PhaseX = p.osc2PhaseOffset;
    let osc2PhaseY = 0.0;
    let osc2Angle = p.osc2Angle;

    if (p.osc2Enabled) {
      const osc2Bounce = { phase: this._osc2BouncePhase, dir: this._osc2BounceDir };
      const osc2Movement = this._computeMovement(p.osc2MovementMode, elapsed, dt,
        p.osc2PhaseOffset, p.osc2Angle, {
          amplitude: p.osc2MovementAmplitude,
          speed: p.osc2MovementSpeed,
          lissajousRatio: 0.5,
          phase: p.osc2MovementPhase,
          spiralSpeed: 1.0,
          scrollAngle: 0.0,
          scrollSpeed: p.osc2MovementSpeed,
          bounceSpeed: p.osc2MovementSpeed,
          bounceState: osc2Bounce,
        });

      // Persist Osc2 bounce state (mutated by reference).
      this._osc2BouncePhase = osc2Bounce.phase;
      this._osc2BounceDir = osc2Bounce.dir;

      osc2PhaseX = osc2Movement.phaseX;
      osc2PhaseY = osc2Movement.phaseY;
      osc2Angle = osc2Movement.angleOffset;
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
    gl.uniform1f(sh.uShapePhaseOffset, phaseOffsetX);
    gl.uniform1f(sh.uShapePhaseOffsetY, phaseOffsetY);
    gl.uniform1i(sh.uShapeFractalAmount, p.shapeFractalAmount);
    gl.uniform1f(sh.uShapeFractalAngle, p.shapeFractalAngle);
    gl.uniform1f(sh.uShapeHue, p.shapeHue);
    gl.uniform1f(sh.uShapeColorSat, p.shapeColorSat);
    gl.uniform1f(sh.uPolarizationAngle, polarizationAngle);

    // Osc2 uniforms.
    gl.uniform1i(sh.uOsc2Enabled, p.osc2Enabled);
    gl.uniform1i(sh.uOsc2Waveform, p.osc2Waveform);
    gl.uniform1f(sh.uOsc2Frequency, p.osc2Frequency);
    gl.uniform1f(sh.uOsc2Angle, osc2Angle);
    gl.uniform1f(sh.uOsc2Thickness, p.osc2Thickness);
    gl.uniform1f(sh.uOsc2Softness, p.osc2Softness);
    gl.uniform1f(sh.uOsc2PhaseOffset, osc2PhaseX);
    gl.uniform1f(sh.uOsc2PhaseOffsetY, osc2PhaseY);
    gl.uniform1i(sh.uOsc2FractalAmount, p.osc2FractalAmount);
    gl.uniform1f(sh.uOsc2FractalAngle, p.osc2FractalAngle);
    gl.uniform1f(sh.uOsc2Hue, p.osc2Hue);
    gl.uniform1f(sh.uOsc2ColorSat, p.osc2ColorSat);
    gl.uniform1i(sh.uOsc2BlendMode, p.osc2BlendMode);

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
