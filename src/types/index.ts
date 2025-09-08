export interface ShapeParameters {
  // Basic properties
  frequency: number // Renamed from diameter - how many shapes fit across viewport
  color: number // HSL hue (0-360)
  intensity: number // Saturation/opacity (0-1)
  transparency: number // Alpha (0=transparent, 1=opaque)
  rotation: number // Rotation speed
  
  // Movement
  movementDirection: number // 0-360 degrees
  movementSpeed: number
}