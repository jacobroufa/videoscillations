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
  if (frequency === 0) return viewportSize * 2 // Largest possible shapes for frequency 0
  return (viewportSize / frequency) * 0.4 // 0.4 factor for visual appeal
}

/**
 * Calculate optimal circular field coverage to prevent edge gaps during rotation
 */
export const calculateCircularFieldDimensions = (
  viewportWidth: number,
  viewportHeight: number,
  frequency: number
): { tilesX: number; tilesY: number; spacing: number; radius: number } => {
  if (frequency === 0) {
    // For frequency 0, use minimal grid with large spacing
    const diagonal = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight)
    return { tilesX: 3, tilesY: 3, spacing: diagonal, radius: diagonal * 0.8 }
  }
  
  const spacing = Math.min(viewportWidth, viewportHeight) / frequency
  
  // Calculate the diagonal of the viewport for optimal circular coverage
  const diagonal = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight)
  
  // Use diagonal as the "effective viewport" to ensure coverage during rotation
  const tilesX = Math.ceil(diagonal / spacing) + 4 // +4 for extra margin
  const tilesY = Math.ceil(diagonal / spacing) + 4 // +4 for extra margin
  
  // Calculate field radius to cover the rotated viewport
  const fieldRadius = diagonal * 0.6 // 60% of diagonal for optimal coverage
  
  return { tilesX, tilesY, spacing, radius: fieldRadius }
}