import { describe, it, expect, beforeEach } from 'vitest'
import { useShapeStore } from './shapeStore'

describe('shapeStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useShapeStore.getState().resetParameters()
  })

  it('should have default parameters', () => {
    const { parameters } = useShapeStore.getState()
    expect(parameters.frequency).toBe(8)
    expect(parameters.color).toBe(0)
    expect(parameters.intensity).toBe(0.8)
    expect(parameters.transparency).toBe(1)
    expect(parameters.rotation).toBe(0)
    expect(parameters.movementDirection).toBe(0)
    expect(parameters.movementSpeed).toBe(0)
    expect(parameters.gain).toBe(50)
    expect(parameters.globalColor).toBe(180)
    expect(parameters.recursiveFeedback).toBe(true)
    expect(parameters.colorBleeding).toBe(false)
    expect(parameters.motionTrails).toBe(false)
    expect(parameters.bloomGlow).toBe(false)
    expect(parameters.multipleExposure).toBe(false)
  })

  it('should update parameters partially', () => {
    const { setParameters, parameters: initialParams } = useShapeStore.getState()
    
    setParameters({ frequency: 12, color: 240 })
    
    const { parameters: updatedParams } = useShapeStore.getState()
    expect(updatedParams.frequency).toBe(12)
    expect(updatedParams.color).toBe(240)
    expect(updatedParams.intensity).toBe(initialParams.intensity) // Should remain unchanged
  })

  it('should reset parameters to defaults', () => {
    const { setParameters, resetParameters } = useShapeStore.getState()
    
    // Change some parameters
    setParameters({ frequency: 20, rotation: 5 })
    
    // Reset
    resetParameters()
    
    const { parameters } = useShapeStore.getState()
    expect(parameters.frequency).toBe(8)
    expect(parameters.rotation).toBe(0)
  })
})