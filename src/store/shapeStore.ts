import { create } from 'zustand'
import { ShapeParameters } from '../types'

interface ShapeStore {
  parameters: ShapeParameters
  setParameters: (params: Partial<ShapeParameters>) => void
  resetParameters: () => void
}

const DEFAULT_PARAMETERS: ShapeParameters = {
  frequency: 8, // 8 spheres across the viewport
  color: 0, // No individual color offset
  intensity: 0.8,
  transparency: 1,
  rotation: 0,
  movementDirection: 0,
  movementSpeed: 0,
  gain: 50, // 50% positive (current state)
  globalColor: 180, // Cyan base color
  
  // Feedback effects - only recursive enabled by default
  recursiveFeedback: true,
  colorBleeding: false,
  motionTrails: false,
  bloomGlow: false,
  multipleExposure: false
}

export const useShapeStore = create<ShapeStore>((set, get) => ({
  parameters: DEFAULT_PARAMETERS,
  
  setParameters: (params: Partial<ShapeParameters>) => {
    set(state => ({
      parameters: { ...state.parameters, ...params }
    }))
  },
  
  resetParameters: () => {
    set({ parameters: DEFAULT_PARAMETERS })
  }
}))