/**
 * Entry point for the Hypnewcade video synthesizer.
 *
 * Initializes WebGL, compiles shaders, creates framebuffers,
 * and starts the render loop.
 */

import { initGL, createProgram, createFullscreenQuadVAO, resizeCanvasToDisplaySize } from './gl.js';
import { PingPongBuffers } from './framebuffers.js';
import { Renderer } from './renderer.js';
import { params } from './params.js';
import { initUI } from './ui.js';

// ---------------------------------------------------------------------------
// Shader sources -- loaded as strings via fetch so they stay in .glsl files.
// ---------------------------------------------------------------------------

async function loadShaderSource(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`Failed to load shader: ${path} (${resp.status})`);
  return resp.text();
}

// ---------------------------------------------------------------------------
// Gather uniform locations for a program.
// ---------------------------------------------------------------------------

function getUniformLocations(gl, program, names) {
  const locs = {};
  for (const name of names) {
    locs[name] = gl.getUniformLocation(program, name);
  }
  return locs;
}

// ---------------------------------------------------------------------------
// Main initialization.
// ---------------------------------------------------------------------------

async function main() {
  // Canvas and WebGL context.
  const canvas = document.getElementById('c');
  const gl = initGL(canvas);

  // Set initial canvas size.
  resizeCanvasToDisplaySize(canvas);

  // Load shader sources in parallel.
  const [vertSrc, feedbackSrc, shapeSrc, displaySrc] = await Promise.all([
    loadShaderSource('./src/shaders/fullscreen.vert'),
    loadShaderSource('./src/shaders/feedback.frag'),
    loadShaderSource('./src/shaders/shape.frag'),
    loadShaderSource('./src/shaders/composite.frag'),
  ]);

  // Compile shader programs (all share the same vertex shader).
  const programs = {
    feedback: createProgram(gl, vertSrc, feedbackSrc),
    shape:    createProgram(gl, vertSrc, shapeSrc),
    display:  createProgram(gl, vertSrc, displaySrc),
  };

  // Gather uniform locations for each program.
  const uniforms = {
    feedback: getUniformLocations(gl, programs.feedback, [
      'uPrevFrame', 'uResolution', 'uRotation', 'uZoom',
      'uXShift', 'uYShift', 'uDecay', 'uHueShift',
      'uMirrorMode', 'uKaleidoscopeAngle', 'uMirrorTarget', 'uBlendMode',
    ]),
    shape: getUniformLocations(gl, programs.shape, [
      'uResolution',
      'uShapeWaveform', 'uShapeFrequency', 'uShapeAngle',
      'uShapeThickness', 'uShapeSoftness', 'uShapePhaseOffset',
      'uShapePhaseOffsetY',
      'uShapeFractalAmount', 'uShapeFractalAngle',
      'uShapeHue', 'uShapeColorSat',
      'uPolarizationAngle',
      'uOsc2Enabled', 'uOsc2Waveform', 'uOsc2Frequency', 'uOsc2Angle',
      'uOsc2Thickness', 'uOsc2Softness', 'uOsc2PhaseOffset', 'uOsc2PhaseOffsetY',
      'uOsc2FractalAmount', 'uOsc2FractalAngle',
      'uOsc2Hue', 'uOsc2ColorSat', 'uOsc2BlendMode',
      'uMirrorMode', 'uKaleidoscopeAngle', 'uMirrorTarget',
    ]),
    display: getUniformLocations(gl, programs.display, [
      'uFrame', 'uBrightness', 'uSaturation',
      'uColorMode', 'uPosterizeLevels',
      'uGradientHue1', 'uGradientHue2', 'uGradientHue3',
      'uMirrorMode', 'uKaleidoscopeAngle', 'uMirrorTarget',
    ]),
  };

  // Create the fullscreen quad VAO (shared by all passes).
  const quadVAO = createFullscreenQuadVAO(gl);

  // Create ping-pong framebuffers for the feedback loop.
  const pingPong = new PingPongBuffers(gl, canvas.width, canvas.height);

  // Handle window resize.
  window.addEventListener('resize', () => {
    if (resizeCanvasToDisplaySize(canvas)) {
      pingPong.resize(canvas.width, canvas.height);
    }
  });

  // Create and start the renderer.
  const renderer = new Renderer(gl, programs, uniforms, pingPong, quadVAO);
  renderer.start(params);

  // Initialize the overlay UI (controls, keyboard shortcuts, presets).
  initUI();

  // Expose params globally for console tweaking.
  window.__params = params;

  console.log(
    '%c Hypnewcade ',
    'background: #111; color: #0ff; font-size: 14px; padding: 4px 8px;',
    'Video synthesizer running. Move mouse or press Tab to show controls.'
  );
}

main().catch((err) => {
  console.error('Hypnewcade initialization failed:', err);
  document.body.style.color = '#f44';
  document.body.style.fontFamily = 'monospace';
  document.body.style.padding = '2em';
  document.body.textContent = `Error: ${err.message}`;
});
