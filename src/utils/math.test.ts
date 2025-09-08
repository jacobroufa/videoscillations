import { describe, it, expect } from 'vitest'
import { lerp, calculateGridDimensions, calculateSphereRadius, calculateCircularFieldDimensions } from './math'

describe('math utilities', () => {
  describe('lerp', () => {
    it('should interpolate between two values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5)
      expect(lerp(10, 20, 0.1)).toBe(11)
    })

    it('should return current value when speed is 0', () => {
      expect(lerp(5, 10, 0)).toBe(5)
    })

    it('should return target value when speed is 1', () => {
      expect(lerp(5, 10, 1)).toBe(10)
    })
  })

  describe('calculateGridDimensions', () => {
    it('should calculate grid dimensions for given viewport and frequency', () => {
      const result = calculateGridDimensions(800, 600, 10)
      expect(result.spacing).toBe(60) // min(800, 600) / 10
      expect(result.tilesX).toBe(Math.ceil(800 / 60) + 2)
      expect(result.tilesY).toBe(Math.ceil(600 / 60) + 2)
    })

    it('should handle square viewport', () => {
      const result = calculateGridDimensions(500, 500, 5)
      expect(result.spacing).toBe(100)
      expect(result.tilesX).toBe(7) // ceil(500/100) + 2
      expect(result.tilesY).toBe(7)
    })
  })

  describe('calculateSphereRadius', () => {
    it('should calculate radius based on viewport size and frequency', () => {
      const result = calculateSphereRadius(1000, 10)
      expect(result).toBe(40) // (1000/10) * 0.4
    })

    it('should scale with frequency', () => {
      const radius5 = calculateSphereRadius(1000, 5)
      const radius10 = calculateSphereRadius(1000, 10)
      expect(radius5).toBe(radius10 * 2) // Half the frequency = double the radius
    })

    it('should handle frequency 0', () => {
      const result = calculateSphereRadius(1000, 0)
      expect(result).toBe(2000) // 1000 * 2 - largest possible shapes
    })
  })

  describe('calculateCircularFieldDimensions', () => {
    it('should calculate circular field dimensions for optimal coverage', () => {
      const result = calculateCircularFieldDimensions(800, 600, 10)
      const diagonal = Math.sqrt(800 * 800 + 600 * 600)
      expect(result.spacing).toBe(60) // min(800, 600) / 10
      expect(result.radius).toBe(diagonal * 0.6)
      expect(result.tilesX).toBeGreaterThan(0)
      expect(result.tilesY).toBeGreaterThan(0)
    })

    it('should handle frequency 0', () => {
      const result = calculateCircularFieldDimensions(800, 600, 0)
      expect(result.tilesX).toBe(3)
      expect(result.tilesY).toBe(3)
      const expectedDiagonal = Math.sqrt(800 * 800 + 600 * 600)
      expect(result.spacing).toBe(expectedDiagonal)
      expect(result.radius).toBe(expectedDiagonal * 0.8)
    })

    it('should provide adequate coverage for rotation', () => {
      const result = calculateCircularFieldDimensions(400, 400, 5)
      const expectedDiagonal = Math.sqrt(400 * 400 + 400 * 400)
      expect(result.radius).toBe(expectedDiagonal * 0.6)
    })
  })
})