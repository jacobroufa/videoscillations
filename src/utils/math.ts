/**
 * Linear interpolation between two values
 */
export const lerp = (current: number, target: number, speed: number): number => {
  return current + (target - current) * speed
}

/**
 * Calculate grid dimensions needed to fill viewport
 */
export const calculateGridDimensions = (
  viewportWidth: number,
  viewportHeight: number,
  frequency: number
): { tilesX: number; tilesY: number; spacing: number } => {
  const spacing = Math.min(viewportWidth, viewportHeight) / frequency
  const tilesX = Math.ceil(viewportWidth / spacing) + 2 // +2 for margin
  const tilesY = Math.ceil(viewportHeight / spacing) + 2 // +2 for margin
  
  return { tilesX, tilesY, spacing }
}

/**
 * Calculate sphere radius based on frequency (how many fit across viewport)
 */
export const calculateSphereRadius = (viewportSize: number, frequency: number): number => {
  return (viewportSize / frequency) * 0.4 // 0.4 factor for visual appeal
}