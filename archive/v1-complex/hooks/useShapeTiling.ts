import { useRef } from 'react'
import * as THREE from 'three'
import { ShapeParameters } from '../store/shapeStore'
import { useSmoothAnimation } from './useSmoothAnimation'
import { useViewportTiling } from './useViewportTiling'
import { useShapeRenderer } from './useShapeRenderer'

export const useShapeTiling = () => {
  const { updateSmoothState, getSmoothState } = useSmoothAnimation()
  const { 
    calculateViewportBounds, 
    calculateTileGrid, 
    calculateWaveGrid, 
    isShapeInViewport 
  } = useViewportTiling()
  const { createShapeMesh, initializeWebcam, cleanup } = useShapeRenderer()
  
  const performanceMetricsRef = useRef({
    lastLogTime: 0,
    frameCount: 0
  })

  const renderShapes = (
    group: THREE.Group,
    camera: THREE.PerspectiveCamera,
    params: ShapeParameters,
    time: number
  ) => {
    // Clear existing shapes
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }

    // Calculate basic parameters
    const radius = params.diameter / 2
    const hue = params.color / 360
    const lightness = params.intensity * params.brightness
    const baseOpacity = params.transparency // 0=transparent, 1=opaque
    const contrastScale = 0.5 + (params.contrast * 0.5)
    
    // Performance-optimized recursion
    const maxRecursionDepth = Math.min(Math.floor(params.recursion * 4) + 1, 4) // Reduced max depth
    const recursionAmount = params.recursion
    
    // Calculate viewport bounds
    const bounds = calculateViewportBounds(camera, radius)
    const spacing = radius * 2
    
    // Performance limits
    const estimatedShapeCount = maxRecursionDepth * Math.ceil(bounds.expandedViewWidth / spacing) * Math.ceil(bounds.expandedViewHeight / spacing)
    const performanceLimit = 600 // Reduced for better performance
    const performanceScale = estimatedShapeCount > performanceLimit ? performanceLimit / estimatedShapeCount : 1
    
    // Debug logging (much less frequent)
    const metrics = performanceMetricsRef.current
    metrics.frameCount++
    if (time - metrics.lastLogTime > 5000) { // Log every 5 seconds
      if (estimatedShapeCount > performanceLimit) {
        console.log('Performance scaling:', {
          estimated: estimatedShapeCount,
          limit: performanceLimit,
          scale: performanceScale.toFixed(2),
          fps: (metrics.frameCount / 5).toFixed(1)
        })
      }
      metrics.lastLogTime = time
      metrics.frameCount = 0
    }

    // Handle wave shapes separately
    if (params.shapeType === 'sin-wave' || params.shapeType === 'tan-wave') {
      renderWaveShapes(group, bounds, params, time, radius, hue, lightness, baseOpacity, contrastScale, maxRecursionDepth, recursionAmount)
      return
    }

    // Regular shape tiling
    const tileGrid = calculateTileGrid(bounds.expandedViewWidth, bounds.expandedViewHeight, spacing, performanceScale)
    
    let shapeCount = 0
    const maxShapes = 500 // Reduced hard limit

    // Render regular tiled shapes
    for (let x = 0; x < tileGrid.tilesX && shapeCount < maxShapes; x++) {
      for (let y = 0; y < tileGrid.tilesY && shapeCount < maxShapes; y++) {
        for (let depth = 0; depth < maxRecursionDepth && shapeCount < maxShapes; depth++) {
          const depthRatio = depth / (maxRecursionDepth - 1 || 1)
          const depthScale = 1 - depthRatio * recursionAmount
          const currentRadius = radius * depthScale
          
          // Auto-adjust opacity for better recursion visibility
          const recursionTransparencyBoost = params.recursion * 0.3
          const adjustedBaseOpacity = Math.min(1, baseOpacity + recursionTransparencyBoost)
          const depthOpacity = adjustedBaseOpacity * (1 - depthRatio * 0.4)
          const currentOpacity = Math.max(0.05, depthOpacity)

          if (currentRadius > 0.01 && currentOpacity > 0.01) {
            // Grid position with overlap for seamless coverage
            const gridX = (x - tileGrid.tilesX / 2) * tileGrid.effectiveSpacing
            const gridY = (y - tileGrid.tilesY / 2) * tileGrid.effectiveSpacing
            
            // Update smooth animation state
            const smoothState = updateSmoothState(
              time,
              params.movementDirection,
              params.movementSpeed,
              params.recursionMovementDirection,
              params.recursionMovementSpeed,
              params.rotation,
              params.recursionRotation,
              spacing,
              depthRatio
            )
            
            // Final position with smooth movement
            const finalX = gridX + smoothState.moveOffset.x + smoothState.recursionOffset.x
            const finalY = gridY + smoothState.moveOffset.y + smoothState.recursionOffset.y
            
            // Viewport culling
            if (!isShapeInViewport(finalX, finalY, currentRadius, bounds.expandedViewWidth, bounds.expandedViewHeight)) {
              continue
            }
            
            const shape = createShapeMesh(params.shapeType, currentRadius, currentOpacity, params)
            
            // Set color and properties
            shape.material.color.setHSL(hue, 1, lightness)
            shape.material.opacity = currentOpacity
            
            const totalRotationAngle = smoothState.rotationAngle + smoothState.recursionRotationAngle
            
            // Rotate position around center
            const rotatedX = finalX * Math.cos(totalRotationAngle) - finalY * Math.sin(totalRotationAngle)
            const rotatedY = finalX * Math.sin(totalRotationAngle) + finalY * Math.cos(totalRotationAngle)
            
            shape.position.set(rotatedX, rotatedY, -depth * 0.2)
            shape.rotation.z = 0 // Keep individual shapes unrotated
            shape.scale.setScalar(contrastScale)
            
            // Handle mirroring
            if (params.radialMirror || params.kaleidoscopeMirror) {
              const mirrorGroup = new THREE.Group()
              const segments = params.kaleidoscopeMirror ? params.mirrorSegments : 2
              
              for (let seg = 0; seg < segments; seg++) {
                const mirrorShape = shape.clone()
                if (params.kaleidoscopeMirror) {
                  const angle = (seg / segments) * Math.PI * 2
                  const dist = Math.sqrt(gridX * gridX + gridY * gridY)
                  mirrorShape.position.x = Math.cos(angle) * dist
                  mirrorShape.position.y = Math.sin(angle) * dist
                  mirrorShape.rotation.z += angle
                } else if (params.radialMirror && seg === 1) {
                  mirrorShape.position.x = -gridX + smoothState.moveOffset.x + smoothState.recursionOffset.x
                  mirrorShape.position.y = -gridY + smoothState.moveOffset.y + smoothState.recursionOffset.y
                }
                mirrorGroup.add(mirrorShape)
              }
              group.add(mirrorGroup)
              shapeCount += segments
            } else {
              group.add(shape)
              shapeCount++
            }

            if (shapeCount >= maxShapes) break
          }
          if (shapeCount >= maxShapes) break
        }
        if (shapeCount >= maxShapes) break
      }
      if (shapeCount >= maxShapes) break
    }
  }

  const renderWaveShapes = (
    group: THREE.Group,
    bounds: any,
    params: ShapeParameters,
    time: number,
    radius: number,
    hue: number,
    lightness: number,
    baseOpacity: number,
    contrastScale: number,
    maxRecursionDepth: number,
    recursionAmount: number
  ) => {
    const waveGrid = calculateWaveGrid(bounds.expandedViewHeight, radius)
    
    let shapeCount = 0
    const maxShapes = 300 // Lower limit for waves

    for (let y = 0; y < waveGrid.waveTilesY && shapeCount < maxShapes; y++) {
      for (let depth = 0; depth < maxRecursionDepth && shapeCount < maxShapes; depth++) {
        const depthRatio = depth / (maxRecursionDepth - 1 || 1)
        const depthScale = 1 - depthRatio * recursionAmount
        const currentRadius = radius * depthScale
        
        const recursionTransparencyBoost = params.recursion * 0.3
        const adjustedBaseOpacity = Math.min(1, baseOpacity + recursionTransparencyBoost)
        const depthOpacity = adjustedBaseOpacity * (1 - depthRatio * 0.4)
        const currentOpacity = Math.max(0.05, depthOpacity)

        if (currentRadius > 0.01 && currentOpacity > 0.01) {
          const gridX = 0 // Waves extend full width
          const gridY = (y - waveGrid.waveTilesY / 2) * waveGrid.waveSpacing
          
          // Update smooth animation for waves
          const smoothState = updateSmoothState(
            time,
            params.movementDirection,
            params.movementSpeed,
            params.recursionMovementDirection,
            params.recursionMovementSpeed,
            params.rotation,
            params.recursionRotation,
            waveGrid.waveSpacing,
            depthRatio
          )
          
          const finalX = gridX + smoothState.moveOffset.x + smoothState.recursionOffset.x
          const finalY = gridY + smoothState.moveOffset.y + smoothState.recursionOffset.y
          
          const shape = createShapeMesh(params.shapeType, currentRadius, currentOpacity, params)
          
          shape.material.color.setHSL(hue, 1, lightness)
          shape.material.opacity = currentOpacity
          
          const totalRotationAngle = smoothState.rotationAngle + smoothState.recursionRotationAngle
          const rotatedX = finalX * Math.cos(totalRotationAngle) - finalY * Math.sin(totalRotationAngle)
          const rotatedY = finalX * Math.sin(totalRotationAngle) + finalY * Math.cos(totalRotationAngle)
          
          shape.position.set(rotatedX, rotatedY, -depth * 0.5)
          shape.rotation.z = totalRotationAngle
          
          const recursionScale = contrastScale * depthScale
          shape.scale.set(1, recursionScale, recursionScale)
          
          group.add(shape)
          shapeCount++

          if (shapeCount >= maxShapes) break
        }
        if (shapeCount >= maxShapes) break
      }
      if (shapeCount >= maxShapes) break
    }
  }

  return {
    renderShapes,
    initializeWebcam,
    cleanup
  }
}