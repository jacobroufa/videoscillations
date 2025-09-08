import { useCallback } from 'react'
import * as THREE from 'three'

export const useViewportTiling = () => {
  
  const calculateViewportBounds = useCallback((
    camera: THREE.PerspectiveCamera,
    radius: number
  ) => {
    const actualCameraDistance = Math.abs(camera.position.z || 5)
    const viewHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * actualCameraDistance
    const viewWidth = viewHeight * (window.innerWidth / window.innerHeight)
    
    // Calculate true edge-to-edge coverage bounds
    // Use camera offset to determine how much extra area we need
    const cameraOffsetX = Math.abs(camera.position.x || 0)
    const cameraOffsetY = Math.abs(camera.position.y || 0)
    
    // Conservative margin calculation for complete coverage
    const baseMargin = Math.max(viewWidth, viewHeight) * 0.5
    const dynamicMargin = Math.max(cameraOffsetX, cameraOffsetY) * 1.5
    const totalMargin = Math.max(baseMargin, dynamicMargin)
    
    const expandedViewWidth = viewWidth + totalMargin * 2
    const expandedViewHeight = viewHeight + totalMargin * 2
    
    return {
      viewWidth,
      viewHeight,
      expandedViewWidth,
      expandedViewHeight,
      totalMargin
    }
  }, [])
  
  const calculateTileGrid = useCallback((
    expandedViewWidth: number,
    expandedViewHeight: number,
    spacing: number,
    performanceScale: number = 1
  ) => {
    // Use smaller effective spacing for overlap to eliminate gaps
    const overlapFactor = 0.92 // More aggressive overlap for seamless coverage
    const effectiveSpacing = spacing * overlapFactor
    
    // Calculate tile counts with generous padding for edge coverage
    const baseTilesX = Math.ceil(expandedViewWidth / effectiveSpacing)
    const baseTilesY = Math.ceil(expandedViewHeight / effectiveSpacing)
    
    // Add more padding tiles for complete edge coverage
    const paddingTiles = 12 // Increased padding
    const tilesX = Math.ceil(baseTilesX * performanceScale) + paddingTiles
    const tilesY = Math.ceil(baseTilesY * performanceScale) + paddingTiles
    
    return {
      tilesX,
      tilesY,
      effectiveSpacing,
      totalTiles: tilesX * tilesY
    }
  }, [])
  
  const calculateWaveGrid = useCallback((
    expandedViewHeight: number,
    radius: number
  ) => {
    // For waves, use tighter spacing and more tiles for seamless coverage
    const waveSpacing = radius * 1.4 // Even tighter spacing for complete coverage
    const paddingWaves = 20 // Even more padding for waves
    const waveTilesY = Math.ceil(expandedViewHeight / waveSpacing) + paddingWaves
    
    return {
      waveTilesY,
      waveSpacing
    }
  }, [])
  
  const isShapeInViewport = useCallback((
    shapeX: number,
    shapeY: number,
    shapeRadius: number,
    expandedViewWidth: number,
    expandedViewHeight: number
  ) => {
    const margin = shapeRadius * 1.5 // Conservative margin for shape bounds
    const maxX = expandedViewWidth / 2 + margin
    const maxY = expandedViewHeight / 2 + margin
    
    return (
      shapeX >= -maxX && shapeX <= maxX &&
      shapeY >= -maxY && shapeY <= maxY
    )
  }, [])
  
  return {
    calculateViewportBounds,
    calculateTileGrid,
    calculateWaveGrid,
    isShapeInViewport
  }
}