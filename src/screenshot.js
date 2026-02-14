/**
 * Screenshot capture utilities for the video synthesizer.
 *
 * Since the WebGL context uses preserveDrawingBuffer: false for performance,
 * screenshots must be captured synchronously within the render loop via
 * renderer.requestScreenshot(callback).
 */

/**
 * Capture the current canvas frame as a Blob (PNG format).
 * Must be called from within the render loop (via requestScreenshot callback)
 * while the canvas still has valid pixel data.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export function captureScreenshot(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to capture canvas screenshot.'));
      }
    }, 'image/png');
  });
}

/**
 * Create a thumbnail from a screenshot blob by drawing it onto
 * an offscreen canvas at a reduced size.
 *
 * @param {Blob} blob - Source image blob.
 * @param {number} [maxWidth=200] - Maximum thumbnail width.
 * @param {number} [maxHeight=150] - Maximum thumbnail height.
 * @returns {Promise<Blob>} Thumbnail blob (PNG).
 */
export async function createThumbnail(blob, maxWidth = 200, maxHeight = 150) {
  const img = new Image();
  const url = URL.createObjectURL(blob);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  URL.revokeObjectURL(url);

  // Calculate scaled dimensions maintaining aspect ratio.
  let w = img.width;
  let h = img.height;
  if (w > maxWidth) {
    h = h * (maxWidth / w);
    w = maxWidth;
  }
  if (h > maxHeight) {
    w = w * (maxHeight / h);
    h = maxHeight;
  }
  w = Math.round(w);
  h = Math.round(h);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob((thumbBlob) => {
      if (thumbBlob) {
        resolve(thumbBlob);
      } else {
        reject(new Error('Failed to create thumbnail.'));
      }
    }, 'image/png');
  });
}
