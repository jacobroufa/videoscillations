import { create } from 'zustand'

export type ShapeType = 'circle' | 'sin-wave' | 'tan-wave' | 'polygon' | 'perlin-noise' | 'webcam'

export interface ShapeParameters {
  // Shape type
  shapeType: ShapeType
  
  // Basic properties (all shapes)
  diameter: number
  color: number
  intensity: number
  brightness: number
  contrast: number
  transparency: number
  rotation: number
  
  // Tiling
  tilingX: number
  tilingY: number
  
  // Movement
  movementDirection: number // 0-360 degrees
  movementSpeed: number
  
  // Z-axis recursion
  recursion: number // Combined depth and amount (0-1)
  recursionMovementDirection: number // 0-360 degrees
  recursionMovementSpeed: number
  recursionRotation: number
  
  // Mirroring
  radialMirror: boolean
  kaleidoscopeMirror: boolean
  mirrorSegments: number
  
  // 3D Camera controls
  cameraX: number // Camera position along X axis
  cameraY: number // Camera position along Y axis
  cameraZ: number // Camera position along Z axis
  
  // Shape-specific properties
  // Circle
  diameterX?: number // Independent X-axis diameter control
  diameterY?: number // Independent Y-axis diameter control
  
  // Polygon
  sides?: number // 3-12 sides
  
  // Sin/Tan waves
  frequency?: number // Wave frequency
  amplitude?: number // Wave amplitude
  
  // Perlin noise
  noiseFrequency?: number // Noise frequency
  noiseBlur?: number // Blur amount for granular/broad resolution
  noiseStyle?: number // 0=solid cloud, 1=textured cloud
}

interface ShapeStore {
  // Current shape parameters
  shapeParams: ShapeParameters
  
  // Animation state
  animationTime: number
  fps: number
  
  // UI state
  controlsVisible: boolean
  
  // Actions
  updateShapeParams: (updates: Partial<ShapeParameters>) => void
  updateAnimationTime: (time: number) => void
  updateFPS: (fps: number) => void
  toggleControls: () => void
  resetToDefaults: () => void
}

const defaultShapeParams: ShapeParameters = {
  // Shape type
  shapeType: 'circle',
  // Basic properties
  diameter: 2,
  color: 180,
  intensity: 0.5,
  brightness: 0.5,
  contrast: 0.5,
  transparency: 1, // 0=transparent, 1=opaque
  rotation: 0,
  
  // Tiling (automatic - no user controls)
  tilingX: 1, // Will be calculated automatically
  tilingY: 1, // Will be calculated automatically
  
  // Movement
  movementDirection: 0, // degrees
  movementSpeed: 0,
  
  // Z-axis recursion
  recursion: 0, // 0-1 combined depth/amount
  recursionMovementDirection: 0, // degrees
  recursionMovementSpeed: 0,
  recursionRotation: 0,
  
  // Mirroring
  radialMirror: false,
  kaleidoscopeMirror: false,
  mirrorSegments: 8,
  
  // 3D Camera controls
  cameraX: 0,
  cameraY: 0,
  cameraZ: 5, // Default camera distance
  
  // Shape-specific defaults
  diameterX: 2,
  diameterY: 2,
  sides: 6,
  frequency: 1,
  amplitude: 1,
  noiseFrequency: 1,
  noiseBlur: 0.5,
  noiseStyle: 0
}

export const useShapeStore = create<ShapeStore>((set, get) => ({
  // Initial state
  shapeParams: defaultShapeParams,
  animationTime: 0,
  fps: 0,
  controlsVisible: false,
  
  // Actions
  updateShapeParams: (updates) =>
    set((state) => ({
      shapeParams: { ...state.shapeParams, ...updates }
    })),
  
  updateAnimationTime: (time) =>
    set({ animationTime: time }),
  
  updateFPS: (fps) =>
    set({ fps }),
  
  toggleControls: () =>
    set((state) => ({ controlsVisible: !state.controlsVisible })),
  
  resetToDefaults: () =>
    set({ shapeParams: defaultShapeParams })
}))