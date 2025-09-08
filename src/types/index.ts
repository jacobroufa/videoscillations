export interface ShapeParameters {
  // Basic properties
  frequency: number // How many shapes fit across viewport (0+)
  color: number // HSL hue (0-360) - individual shape color offset
  intensity: number // Saturation/opacity (0-1)
  transparency: number // Alpha (0=transparent, 1=opaque)
  rotation: number // Rotation speed
  
  // Movement
  movementDirection: number // 0-360 degrees
  movementSpeed: number
  
  // 3D Plane controls
  gain: number // -100 to +100, affects lighting and inversion
  globalColor: number // HSL hue (0-360) - base color for all shapes
  
  // Feedback effects
  recursiveFeedback: boolean
  colorBleeding: boolean
  motionTrails: boolean
  bloomGlow: boolean
  multipleExposure: boolean
}