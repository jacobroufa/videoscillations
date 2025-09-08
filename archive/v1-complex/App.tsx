import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import ParameterControls from './components/ParameterControls'

type ShapeType = 'circle' | 'sin-wave' | 'tan-wave' | 'polygon' | 'perlin-noise' | 'webcam'

interface ShapeParameters {
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

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const circleGroupRef = useRef<THREE.Group>()
  const sceneRef = useRef<THREE.Scene>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const animationTimeRef = useRef<number>(0)
  const shapeParamsRef = useRef<ShapeParameters>()
  const smoothParamsRef = useRef<ShapeParameters>()
  const smoothAnimationStateRef = useRef<{
    moveOffset: { x: number, y: number }
    recursionOffset: { x: number, y: number }
    rotationAngle: number
    recursionRotationAngle: number
  }>()
  const [controlsVisible, setControlsVisible] = useState(false)
  const [fps, setFps] = useState(0)
  const fpsCounterRef = useRef({ frameCount: 0, lastTime: 0 })
  const textureCache = useRef<Map<string, THREE.CanvasTexture>>(new Map())
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const webcamTextureRef = useRef<THREE.VideoTexture | null>(null)
  const [shapeParams, setShapeParams] = useState<ShapeParameters>({
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
  })


  // Helper function for linear interpolation
  const lerp = (from: number, to: number, factor: number) => {
    return from + (to - from) * factor
  }

  const updateCircleGroupWithAnimation = useCallback(() => {
      if (!circleGroupRef.current || !shapeParamsRef.current) return

      const group = circleGroupRef.current
      const targetParams = shapeParamsRef.current
      const time = animationTimeRef.current

      // Initialize smooth animation state on first run
      if (!smoothAnimationStateRef.current) {
        smoothAnimationStateRef.current = {
          moveOffset: { x: 0, y: 0 },
          recursionOffset: { x: 0, y: 0 },
          rotationAngle: 0,
          recursionRotationAngle: 0
        }
      }

      const params = targetParams
      const smoothState = smoothAnimationStateRef.current
      const easingSpeed = 0.08 // Adjust for faster/slower transitions
      
      // Clear existing circles
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

      // Basic properties
      let radius = params.diameter / 2
      const hue = params.color / 360
      const lightness = params.intensity * params.brightness
      const baseOpacity = params.transparency // 0=transparent, 1=opaque
      const contrastScale = 0.5 + (params.contrast * 0.5)

      // Calculate 3D frustum-based viewport coverage first
      const camera = cameraRef.current
      const actualCameraDistance = Math.abs(camera?.position.z || 5)
      
      // Calculate the viewport dimensions at the Z=0 plane (where shapes are positioned)
      const fov = 75 * Math.PI / 180
      const aspect = window.innerWidth / window.innerHeight
      const viewHeight = 2 * Math.tan(fov / 2) * actualCameraDistance
      const viewWidth = viewHeight * aspect
      
      // Enforce minimum diameter for performance (target ~1000 shapes max)
      // Calculate what minimum radius keeps us under 1000 shapes
      const targetMaxShapes = 1000
      const viewArea = viewWidth * viewHeight
      const minRadiusForPerformance = Math.sqrt(viewArea / (targetMaxShapes * Math.PI)) 
      
      // Apply minimum radius if current radius would create too many shapes
      if (radius < minRadiusForPerformance) {
        radius = minRadiusForPerformance
        console.log(`⚡ Performance: Auto-adjusted radius from ${params.diameter/2} to ${radius} for <1000 shapes`)
      }
      
      // Calculate recursion properties - reduce layers for tiny shapes
      let maxRecursionDepth = Math.min(Math.floor(params.recursion * 6) + 1, 5) // Limit to 5 layers max for performance
      if (radius < 0.1 && maxRecursionDepth > 2) {
        maxRecursionDepth = Math.max(1, Math.floor(maxRecursionDepth * 0.6)) // Reduce recursion for tiny shapes
      }
      const recursionAmount = params.recursion // 0-1 scale factor

      // Calculate spacing based on final radius
      let spacing = radius * 2
      
      // Calculate frustum bounds at Z=0 plane relative to camera position
      // This accounts for camera movement in 3D space
      const cameraX = camera?.position.x || 0
      const cameraY = camera?.position.y || 0
      
      // The visible area at Z=0 is centered on the camera's X,Y position
      const visibleLeft = cameraX - viewWidth / 2
      const visibleRight = cameraX + viewWidth / 2
      const visibleBottom = cameraY - viewHeight / 2
      const visibleTop = cameraY + viewHeight / 2
      
      // Add generous margin for movement - we'll handle dynamic culling later
      const baseMargin = Math.max(radius * 4, viewWidth * 0.3) // Larger base margin for movement
      const tilingLeft = visibleLeft - baseMargin
      const tilingRight = visibleRight + baseMargin  
      const tilingBottom = visibleBottom - baseMargin
      const tilingTop = visibleTop + baseMargin
      
      const tilingWidth = tilingRight - tilingLeft
      const tilingHeight = tilingTop - tilingBottom
      
      // Performance monitoring - but prioritize edge coverage for small shapes
      const estimatedShapeCount = maxRecursionDepth * Math.ceil(tilingWidth / spacing) * Math.ceil(tilingHeight / spacing)
      
      // Dynamic performance limit based on shape size - be more generous for small shapes
      const shapeSizeFactor = Math.max(0.2, radius / 2) // More generous factor for smaller shapes
      const basePerformanceLimit = 4000 // Higher base limit
      const adjustedPerformanceLimit = Math.floor(basePerformanceLimit / shapeSizeFactor)
      
      const performanceScale = estimatedShapeCount > adjustedPerformanceLimit ? adjustedPerformanceLimit / estimatedShapeCount : 1
      
      // Initialize smooth animation state early for dynamic calculations
      if (!smoothAnimationStateRef.current) {
        smoothAnimationStateRef.current = {
          moveOffset: { x: 0, y: 0 },
          recursionOffset: { x: 0, y: 0 },
          rotationAngle: 0,
          recursionRotationAngle: 0
        }
      }
      
      // Track shape count for performance monitoring - scale max shapes based on size
      const baseMaxShapes = 5000 // Increased for complete viewport coverage  
      const maxShapes = Math.floor(baseMaxShapes / shapeSizeFactor) // More shapes allowed for smaller shapes
      
      // Simple fundamental diagnostic (every 2 seconds)
      if (Math.floor(time * 0.5) % 2 === 0 && Math.floor(time * 10) % 10 === 0) {
        console.log('🔍 FUNDAMENTAL DIAGNOSTIC:', {
          radius: radius.toFixed(3),
          spacing: spacing.toFixed(3), 
          viewportSize: `${viewWidth.toFixed(1)}x${viewHeight.toFixed(1)}`,
          cameraAt: `(${cameraX.toFixed(1)}, ${cameraY.toFixed(1)}, ${(camera?.position.z || 0).toFixed(1)})`,
          visibleArea: `X: ${visibleLeft.toFixed(1)} to ${visibleRight.toFixed(1)}, Y: ${visibleBottom.toFixed(1)} to ${visibleTop.toFixed(1)}`
        })
      }
      
      // For webcam shapes, use edge-to-edge spacing with no gaps
      if (params.shapeType === 'webcam') {
        spacing = radius * 2 // Exact edge-to-edge for rectangular shapes
      }
      
      // Initialize shape counter
      let shapeCount = 0
      
      // For wave shapes, tile them but use different spacing logic
      if (params.shapeType === 'sin-wave' || params.shapeType === 'tan-wave') {
        // Enhanced wave tiling for TRUE edge-to-edge viewport coverage
        const waveSpacing = radius * 1.4 // Tighter spacing for complete coverage
        
        // Calculate tiles to cover the tiling area (including margins)
        const waveTilesY = Math.ceil(tilingHeight / waveSpacing) + 4 // +4 for overlap
        
        for (let y = 0; y < waveTilesY && shapeCount < maxShapes; y++) {
          // Create recursion layers for each wave line
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
              // Grid position for waves (only Y tiling) adjusted for 3D frustum coverage
              const gridX = cameraX // Center waves on camera X position  
              const gridY = tilingBottom + (y * waveSpacing)
              
              // Apply movement animation using direction with smooth continuous movement
              const moveAngle = (params.movementDirection * Math.PI) / 180
              const rawMoveDistance = time * params.movementSpeed * 0.3 // Reduced speed for smoothness
              const targetMoveX = Math.cos(moveAngle) * rawMoveDistance
              const targetMoveY = Math.sin(moveAngle) * rawMoveDistance
              
              // Smooth the movement offsets
              smoothState.moveOffset.x = lerp(smoothState.moveOffset.x, targetMoveX, easingSpeed)
              smoothState.moveOffset.y = lerp(smoothState.moveOffset.y, targetMoveY, easingSpeed)
              
              // Apply recursion movement animation
              const recursionAngle = (params.recursionMovementDirection * Math.PI) / 180
              const targetRecursionDistance = time * params.recursionMovementSpeed * 0.5
              const targetRecursionOffsetX = Math.cos(recursionAngle) * targetRecursionDistance * depthRatio
              const targetRecursionOffsetY = Math.sin(recursionAngle) * targetRecursionDistance * depthRatio
              
              const currentRecursionOffsetX = lerp(smoothState.recursionOffset.x, targetRecursionOffsetX, easingSpeed)
              const currentRecursionOffsetY = lerp(smoothState.recursionOffset.y, targetRecursionOffsetY, easingSpeed)
              
              // Final position with recursion offset
              const finalX = gridX + smoothState.moveOffset.x + currentRecursionOffsetX
              const finalY = gridY + smoothState.moveOffset.y + currentRecursionOffsetY
              
              // Calculate rotation angles
              const targetBaseRotationAngle = time * params.rotation * 1.5
              const targetRecursionRotationAngle = time * params.recursionRotation * 1.5 * (depth + 1)
              
              smoothState.rotationAngle = lerp(smoothState.rotationAngle, targetBaseRotationAngle, easingSpeed)
              smoothState.recursionRotationAngle = lerp(smoothState.recursionRotationAngle, targetRecursionRotationAngle, easingSpeed)
              
              const totalRotationAngle = smoothState.rotationAngle + smoothState.recursionRotationAngle
              
              // Rotate the position around center
              const rotatedX = finalX * Math.cos(totalRotationAngle) - finalY * Math.sin(totalRotationAngle)
              const rotatedY = finalX * Math.sin(totalRotationAngle) + finalY * Math.cos(totalRotationAngle)
              
              const shape = createShapeMesh(params.shapeType, currentRadius, currentOpacity, params)
              
              // Set color and properties
              shape.material.color.setHSL(hue, 1, lightness)
              shape.material.opacity = currentOpacity
              // True 3D recursion with significant depth separation
              const zDepth = -depth * 2.0 // Increased separation for visible 3D effect  
              shape.position.set(rotatedX, rotatedY, zDepth)
              shape.rotation.z = totalRotationAngle // Apply rotation to the wave itself
              
              // Apply depth-based scaling - waves should get thinner/smaller in recursion layers
              const recursionScale = contrastScale * depthScale
              shape.scale.set(1, recursionScale, recursionScale) // Keep X scale full for edge-to-edge, scale Y for thickness
              
              group.add(shape)
              shapeCount++
              
              // Early performance exit if needed
              if (shapeCount >= maxShapes) break
            }
          }
        }
        return // Skip the regular tiling loop for wave shapes
      }
      
      // VIEWPORT-BASED APPROACH: Only calculate shapes needed for current view
      // Performance optimization: ensure adequate coverage while maintaining performance
      // Increased limits to ensure complete viewport coverage
      const maxShapesForRadius = radius < 0.1 ? 12000 : radius < 0.5 ? 15000 : maxShapes
      const effectiveMaxShapes = Math.min(maxShapes, maxShapesForRadius)
      
      // SIMPLIFIED APPROACH: Account for current movement when calculating tile area
      const currentMoveX = smoothState.moveOffset.x || 0
      const currentMoveY = smoothState.moveOffset.y || 0
      
      // Calculate dynamic margin based on movement speed and rotation
      const maxMovementDistance = Math.max(
        params.movementSpeed * 5, // Account for 5 seconds of movement
        params.recursionMovementSpeed * 5
      )
      
      // For rotation, calculate the maximum possible displacement
      const maxRotationDisplacement = params.rotation !== 0 
        ? Math.sqrt(viewWidth * viewWidth + viewHeight * viewHeight) * 0.75 // 75% of diagonal for safety
        : 0
      
      // Calculate coverage margin
      const coverageMargin = Math.max(
        spacing * 4, 
        maxMovementDistance + spacing,
        maxRotationDisplacement + spacing
      )
      
      // Adjust the tile generation area to account for CURRENT movement
      // If shapes move right (+X), we need more tiles on the left, so expand left boundary
      // If shapes move left (-X), we need more tiles on the right, so expand right boundary
      const adjustedVisibleLeft = visibleLeft + currentMoveX  // Expand opposite to movement
      const adjustedVisibleRight = visibleRight + currentMoveX
      const adjustedVisibleBottom = visibleBottom + currentMoveY
      const adjustedVisibleTop = visibleTop + currentMoveY
      
      const startX = adjustedVisibleLeft - coverageMargin
      const endX = adjustedVisibleRight + coverageMargin  
      const startY = adjustedVisibleBottom - coverageMargin
      const endY = adjustedVisibleTop + coverageMargin
      
      const tilesX = Math.ceil((endX - startX) / spacing)
      const tilesY = Math.ceil((endY - startY) / spacing)
      
      // Debug viewport-based calculation
      if (Math.floor(time * 0.5) % 2 === 0 && Math.floor(time * 10) % 10 === 0) {
        console.log('📐 SIMPLIFIED TILES:', {
          coverageArea: `X: ${startX.toFixed(1)} to ${endX.toFixed(1)}, Y: ${startY.toFixed(1)} to ${endY.toFixed(1)}`,
          tilesNeeded: `${tilesX} x ${tilesY} = ${tilesX * tilesY}`,
          maxShapesAllowed: effectiveMaxShapes,
          spacing: spacing.toFixed(3),
          margin: coverageMargin.toFixed(2)
        })
      }
      
      // SIMPLIFIED GRID: Simple nested loops for direct coverage
      for (let x = 0; x < tilesX && shapeCount < effectiveMaxShapes; x++) {
        for (let y = 0; y < tilesY && shapeCount < effectiveMaxShapes; y++) {
        
        // Create recursion layers with performance limits
        const effectiveMaxDepth = performanceScale < 0.5 ? Math.ceil(maxRecursionDepth * 0.5) : maxRecursionDepth
        for (let depth = 0; depth < effectiveMaxDepth && shapeCount < effectiveMaxShapes; depth++) {
            const depthRatio = depth / (maxRecursionDepth - 1 || 1)
            const depthScale = 1 - depthRatio * recursionAmount
            const currentRadius = radius * depthScale
            
            // Auto-adjust opacity for better recursion visibility
            // Base transparency increases with recursion for better depth perception
            const recursionTransparencyBoost = params.recursion * 0.3 // More recursion = more transparency
            const adjustedBaseOpacity = Math.min(1, baseOpacity + recursionTransparencyBoost)
            const depthOpacity = adjustedBaseOpacity * (1 - depthRatio * 0.4) // Each layer gets more transparent
            const currentOpacity = Math.max(0.05, depthOpacity) // Minimum visibility

            if (currentRadius > 0.01 && currentOpacity > 0.01) {
              // INFINITE TILING: Generate base grid positions
              const baseGridX = startX + x * spacing
              const baseGridY = startY + y * spacing
              
              // Calculate continuous movement (not tied to slider position)
              const moveAngle = (params.movementDirection * Math.PI) / 180
              const continuousMoveX = Math.cos(moveAngle) * time * params.movementSpeed * 0.3
              const continuousMoveY = Math.sin(moveAngle) * time * params.movementSpeed * 0.3
              
              // For infinite tiling, wrap the movement within the spacing to create seamless repetition
              const wrappedMoveX = continuousMoveX % spacing
              const wrappedMoveY = continuousMoveY % spacing
              
              // Calculate recursion movement with infinite wrapping (like shape movement)
              const recursionAngle = (params.recursionMovementDirection * Math.PI) / 180
              const continuousRecursionMoveX = Math.cos(recursionAngle) * time * params.recursionMovementSpeed * 0.5 * depthRatio
              const continuousRecursionMoveY = Math.sin(recursionAngle) * time * params.recursionMovementSpeed * 0.5 * depthRatio
              
              // Wrap recursion movement within spacing to prevent falling off
              const wrappedRecursionMoveX = continuousRecursionMoveX % spacing
              const wrappedRecursionMoveY = continuousRecursionMoveY % spacing
              
              // Final position: base grid + wrapped movement + wrapped recursion movement
              const finalX = baseGridX + wrappedMoveX + wrappedRecursionMoveX
              const finalY = baseGridY + wrappedMoveY + wrappedRecursionMoveY
              
              // Debug edge tiles with simplified coordinates
              if (depth === 0 && Math.floor(time * 0.5) % 2 === 0 && Math.floor(time * 10) % 10 === 0) {
                if (x === 0 && y === 0) {
                  console.log(`📍 FIRST TILE [${x},${y}]:`, {
                    baseGrid: `(${baseGridX.toFixed(2)}, ${baseGridY.toFixed(2)})`,
                    wrappedMove: `(${wrappedMoveX.toFixed(2)}, ${wrappedMoveY.toFixed(2)})`,
                    finalPos: `(${finalX.toFixed(2)}, ${finalY.toFixed(2)})`,
                    leftCoverage: (finalX - currentRadius <= visibleLeft) ? 'COVERS' : 'GAP',
                    leftEdgeDistance: (finalX - currentRadius - visibleLeft).toFixed(3)
                  })
                }
                if (x >= tilesX - 2 && y === 0) {
                  console.log(`📍 RIGHT TILE [${x},${y}]:`, {
                    baseGrid: `(${baseGridX.toFixed(2)}, ${baseGridY.toFixed(2)})`,
                    wrappedMove: `(${wrappedMoveX.toFixed(2)}, ${wrappedMoveY.toFixed(2)})`,
                    finalPos: `(${finalX.toFixed(2)}, ${finalY.toFixed(2)})`,
                    rightCoverage: (finalX + currentRadius >= visibleRight) ? 'COVERS' : 'GAP',
                    rightEdgeDistance: (finalX + currentRadius - visibleRight).toFixed(3)
                  })
                }
              }
              
              // DEBUG: Track culling to see if it's removing too many shapes
              let isCulled = false
              let cullReason = ''
              
              // Smart viewport culling - use the same margin as tile generation to ensure consistency
              const cullingMargin = coverageMargin + currentRadius // Match the dynamic coverage margin
              const leftBound = visibleLeft - cullingMargin
              const rightBound = visibleRight + cullingMargin
              const bottomBound = visibleBottom - cullingMargin
              const topBound = visibleTop + cullingMargin
              
              // CALCULATE ROTATION FIRST to get actual final position
              const targetBaseRotationAngle = time * params.rotation * 1.5
              const targetRecursionRotationAngle = time * params.recursionRotation * 1.5 * (depth + 1)
              
              // Smooth the rotation angles
              smoothState.rotationAngle = lerp(smoothState.rotationAngle, targetBaseRotationAngle, easingSpeed)
              smoothState.recursionRotationAngle = lerp(smoothState.recursionRotationAngle, targetRecursionRotationAngle, easingSpeed)
              
              // Apply BOTH rotations to pattern positioning (both rotate around central axis)
              const totalPatternRotation = smoothState.rotationAngle + smoothState.recursionRotationAngle
              const rotatedX = finalX * Math.cos(totalPatternRotation) - finalY * Math.sin(totalPatternRotation)
              const rotatedY = finalX * Math.sin(totalPatternRotation) + finalY * Math.cos(totalPatternRotation)
              
              // Check culling bounds using ROTATED position (actual final position)
              if (rotatedX + currentRadius < leftBound) {
                isCulled = true
                cullReason = 'TOO_FAR_LEFT'
              } else if (rotatedX - currentRadius > rightBound) {
                isCulled = true
                cullReason = 'TOO_FAR_RIGHT'
              } else if (rotatedY + currentRadius < bottomBound) {
                isCulled = true
                cullReason = 'TOO_FAR_BOTTOM'
              } else if (rotatedY - currentRadius > topBound) {
                isCulled = true
                cullReason = 'TOO_FAR_TOP'
              }
              
              // Debug culling for edge shapes - now using ROTATED positions
              if (depth === 0 && isCulled && Math.floor(time * 0.5) % 2 === 0 && Math.floor(time * 10) % 10 === 0) {
                if (x === 0 && y === 0) {
                  console.log(`🚫 FIRST SHAPE CULLED [${x},${y}]:`, {
                    preRotation: `(${finalX.toFixed(2)}, ${finalY.toFixed(2)})`,
                    postRotation: `(${rotatedX.toFixed(2)}, ${rotatedY.toFixed(2)})`,
                    reason: cullReason,
                    cullingBounds: `X: ${leftBound.toFixed(2)} to ${rightBound.toFixed(2)}`
                  })
                }
                if (x >= tilesX - 2 && y === 0) {
                  console.log(`🚫 RIGHTMOST SHAPE CULLED [${x},${y}]:`, {
                    preRotation: `(${finalX.toFixed(2)}, ${finalY.toFixed(2)})`,
                    postRotation: `(${rotatedX.toFixed(2)}, ${rotatedY.toFixed(2)})`,
                    reason: cullReason,
                    cullingBounds: `X: ${leftBound.toFixed(2)} to ${rightBound.toFixed(2)}`,
                    viewportRightEdge: visibleRight.toFixed(2),
                    reachesRightEdge: (rotatedX + currentRadius > visibleRight) ? 'YES' : 'NO'
                  })
                }
              }
              
              if (isCulled) {
                continue
              }
              
              const shape = createShapeMesh(params.shapeType, currentRadius, currentOpacity, params)
              
              // Set color
              shape.material.color.setHSL(hue, 1, lightness)
              shape.material.opacity = currentOpacity
              
              // Use the rotated position already calculated for culling
              // True 3D recursion with significant depth separation
              const zDepth = -depth * 2.0 // Increased separation for visible 3D effect
              shape.position.set(rotatedX, rotatedY, zDepth)
              
              // Both rotations now applied to pattern positioning, no individual shape rotation needed
              shape.rotation.z = 0
              
              // Debug logging for first tile
              if (x === 0 && y === 0 && depth === 0 && Math.floor(time * 2) % 4 === 0) {
                console.log('Pattern rotation debug:', {
                  baseRotation: smoothState.rotationAngle.toFixed(2),
                  recursionRotation: smoothState.recursionRotationAngle.toFixed(2),
                  totalPatternRotation: totalPatternRotation.toFixed(2),
                  originalPos: `(${finalX.toFixed(1)}, ${finalY.toFixed(1)})`,
                  rotatedPos: `(${rotatedX.toFixed(1)}, ${rotatedY.toFixed(1)})`,
                  time: time.toFixed(2)
                })
              }
              
              // Apply scaling
              shape.scale.setScalar(contrastScale)
              
              // Simple mirroring
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
                    mirrorShape.position.x = -(gridX + moveX + recursionOffsetX)
                    mirrorShape.position.y = -(gridY + moveY + recursionOffsetY)
                  }
                  mirrorGroup.add(mirrorShape)
                }
                group.add(mirrorGroup)
                shapeCount += segments // Count all mirror segments
              } else {
                group.add(shape)
                shapeCount++
              }
              
              // Early performance exit if needed
              if (shapeCount >= effectiveMaxShapes) break
            }
          }
        }
      }
        
        // Simple final count debug
        if (Math.floor(time * 0.5) % 2 === 0 && Math.floor(time * 10) % 10 === 0) {
          const expectedShapes = tilesX * tilesY * maxRecursionDepth
          console.log('✅ FINAL COUNT:', {
            expected: expectedShapes.toLocaleString(),
            actual: shapeCount.toLocaleString(),
            percentage: ((shapeCount / expectedShapes) * 100).toFixed(1) + '%',
            maxAllowed: maxShapes.toLocaleString()
          })
        }
      }, [shapeParams])

  useEffect(() => {
    if (!mountRef.current) return

    console.log('Initializing Three.js scene with dynamic edge coverage')

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x111111)
    
    // Add bright, centered lighting for 3D shapes
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8) // Brighter ambient light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2) // Brighter main light
    mainLight.position.set(0, 0, 10) // Positioned front and center
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6) // Rim light for definition
    rimLight.position.set(0, 5, -5) // Behind and above for edge highlighting
    
    scene.add(ambientLight)
    scene.add(mainLight)
    scene.add(rimLight)
    
    mountRef.current.appendChild(renderer.domElement)
    camera.position.z = 5
    cameraRef.current = camera

    // Create circle group for complex effects
    const circleGroup = new THREE.Group()
    // Center the group at origin (0,0,0) for proper viewport coverage
    circleGroup.position.set(0, 0, 0)
    scene.add(circleGroup)
    circleGroupRef.current = circleGroup
    sceneRef.current = scene

    console.log('Added circle group to scene')

    // Initialize webcam if needed
    initializeWebcam()

    // Animation loop  
    let animationId: number
    const animate = (time: number = 0) => {
      animationId = requestAnimationFrame(animate)
      
      // Update time for animations
      animationTimeRef.current = time * 0.001 // Convert to seconds
      
      // Update FPS counter
      const fpsCounter = fpsCounterRef.current
      fpsCounter.frameCount++
      if (time - fpsCounter.lastTime >= 1000) { // Update every second
        setFps(Math.round(fpsCounter.frameCount * 1000 / (time - fpsCounter.lastTime)))
        fpsCounter.frameCount = 0
        fpsCounter.lastTime = time
      }
      
      // Update circle group with animation
      updateCircleGroupWithAnimation()
      
      // Camera positioning disabled temporarily
      // if (cameraRef.current && shapeParamsRef.current) {
      //   const params = shapeParamsRef.current
      //   cameraRef.current.position.set(params.cameraX, params.cameraY, params.cameraZ)
      //   // Keep camera looking at the center
      //   cameraRef.current.lookAt(0, 0, 0)
      // }
      
      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      
      // Cleanup webcam
      if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        const tracks = (webcamVideoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
      if (webcamTextureRef.current) {
        webcamTextureRef.current.dispose()
      }
    }
  }, [])

  // Function to create different shape meshes
  const createShapeMesh = (shapeType: ShapeType, radius: number, opacity: number = 1, params: ShapeParameters) => {
    let geometry: THREE.BufferGeometry
    
    switch (shapeType) {
      case 'circle':
        // Use 3D sphere geometry for true spherical shapes
        geometry = new THREE.SphereGeometry(radius, 32, 16)
        break
      
      case 'polygon':
        const sides = params.sides || 6
        // Create true 3D polygon (extruded polygon shape)
        geometry = createPolygonGeometry(radius, sides)
        break
      
      case 'sin-wave':
        geometry = createSinWaveGeometry(radius, params.frequency || 1, params.amplitude || 1)
        break
      
      case 'tan-wave':
        geometry = createTanWaveGeometry(radius, params.frequency || 1, params.amplitude || 1)
        break
      
      case 'perlin-noise':
        const noiseStyle = params.noiseStyle || 0
        geometry = createPerlinNoise3DGeometry(radius, params.noiseFrequency || 1, params.noiseBlur || 0.5, noiseStyle)
        
        // For texture style, create a cached material with canvas texture
        if (noiseStyle > 0.5) {
          const cacheKey = `${params.noiseFrequency}-${params.noiseBlur}-${noiseStyle}`
          let texture = textureCache.current.get(cacheKey)
          
          if (!texture) {
            const textureCanvas = createNoiseTexture(128, params.noiseFrequency || 1, params.noiseBlur || 0.5, noiseStyle)
            texture = new THREE.CanvasTexture(textureCanvas)
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
            textureCache.current.set(cacheKey, texture)
            
            // Limit cache size to prevent memory issues
            if (textureCache.current.size > 20) {
              const firstKey = textureCache.current.keys().next().value
              if (firstKey) {
                const oldTexture = textureCache.current.get(firstKey)
                oldTexture?.dispose()
                textureCache.current.delete(firstKey)
              }
            }
          }
          
          const noiseMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide
          })
          return new THREE.Mesh(geometry, noiseMaterial)
        }
        break
      
      case 'webcam':
        geometry = new THREE.PlaneGeometry(radius * 2, radius * 2)
        
        // Create webcam material with video texture
        if (webcamTextureRef.current) {
          // Update texture for video frame changes
          if (webcamVideoRef.current && webcamVideoRef.current.readyState >= 2) {
            webcamTextureRef.current.needsUpdate = true
          }
          
          const webcamMaterial = new THREE.MeshBasicMaterial({
            map: webcamTextureRef.current,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide
          })
          return new THREE.Mesh(geometry, webcamMaterial)
        } else {
          // Fallback to placeholder if webcam not available
          const placeholderMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: opacity * 0.5,
            side: THREE.DoubleSide
          })
          return new THREE.Mesh(geometry, placeholderMaterial)
        }
      
      default:
        geometry = new THREE.CircleGeometry(radius, 32)
        break
    }
    
    // Use lit material for 3D depth perception
    const material = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    
    // Rotate true polyhedra dice for optimal viewing
    if (shapeType === 'polygon') {
      switch (params.sides) {
        case 3: // Tetrahedron
          mesh.rotation.x = Math.PI / 6
          mesh.rotation.y = Math.PI / 4
          break
        case 4: // Cube  
        case 6: // Cube
          mesh.rotation.x = Math.PI / 8
          mesh.rotation.y = Math.PI / 8
          break
        case 8: // Octahedron
          mesh.rotation.x = Math.PI / 4
          mesh.rotation.y = Math.PI / 6
          break
        case 12: // Dodecahedron
          mesh.rotation.x = Math.PI / 6
          mesh.rotation.y = Math.PI / 5
          break
        default: // Other polyhedra
          mesh.rotation.x = Math.PI / 5
          mesh.rotation.y = Math.PI / 7
          break
      }
    }
    // Spheres look good from all angles
    
    return mesh
  }
  
  // Helper function to create sin wave geometry (full viewport edge-to-edge, rotated to XZ plane)
  const createSinWaveGeometry = (radius: number, frequency: number, amplitude: number) => {
    const segments = 128
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []
    
    // Calculate full viewport width at camera distance with extra margin
    const viewDistance = 5 // Camera distance
    const viewHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * viewDistance
    const viewWidth = viewHeight * (window.innerWidth / window.innerHeight)
    const extendedWidth = viewWidth * 2 // Make it even wider to ensure edge-to-edge coverage
    
    // Create a straight line edge-to-edge with sin wave modulating thickness
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * extendedWidth // Extended viewport width
      const t = x * frequency // Position along line affects wave
      const thickness = (Math.sin(t) * amplitude + 1) * radius * 0.2 // Sin wave controls thickness
      
      // Create vertices in XY plane with thickness as width (Y direction)
      // X extends across viewport, Y varies for thickness (width), Z stays at 0
      vertices.push(x, thickness, 0)   // Top edge 
      vertices.push(x, -thickness, 0)  // Bottom edge
    }
    
    // Create triangles to form the thick line shape
    for (let i = 0; i < segments; i++) {
      const base = i * 2
      // Two triangles per segment
      indices.push(base, base + 1, base + 2)
      indices.push(base + 1, base + 3, base + 2)
    }
    
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()
    
    return geometry
  }
  
  // Helper function to create tan wave geometry (full viewport edge-to-edge, rotated to XZ plane)
  const createTanWaveGeometry = (radius: number, frequency: number, amplitude: number) => {
    const segments = 128
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []
    
    // Calculate full viewport width at camera distance with extra margin
    const viewDistance = 5 // Camera distance
    const viewHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * viewDistance
    const viewWidth = viewHeight * (window.innerWidth / window.innerHeight)
    const extendedWidth = viewWidth * 2 // Make it even wider to ensure edge-to-edge coverage
    
    // Create a straight line edge-to-edge with tan wave modulating thickness
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * extendedWidth // Extended viewport width
      const t = x * frequency // Position along line affects wave
      
      // Use tan for thickness but clamp to avoid infinity
      const tanValue = Math.tan(t * 0.5) // Reduced to avoid extreme values
      const thickness = Math.max(0.01, Math.min(radius * 0.5, Math.abs(tanValue) * amplitude * radius * 0.1))
      
      // Create vertices in XY plane with thickness as width (Y direction)
      // X extends across viewport, Y varies for thickness (width), Z stays at 0
      vertices.push(x, thickness, 0)   // Top edge
      vertices.push(x, -thickness, 0)  // Bottom edge
    }
    
    // Create triangles to form the thick line shape
    for (let i = 0; i < segments; i++) {
      const base = i * 2
      // Two triangles per segment
      indices.push(base, base + 1, base + 2)
      indices.push(base + 1, base + 3, base + 2)
    }
    
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()
    
    return geometry
  }
  
  // Helper function to create perlin noise geometry (cloud shapes)
  const createPerlinNoiseGeometry = (radius: number, frequency: number, blur: number, style: number) => {
    const segments = 64 // Higher resolution for smoother organic shapes
    const geometry = new THREE.CircleGeometry(radius, segments)
    
    // Simple noise function (pseudo-perlin)
    const noise = (x: number, y: number, scale: number) => {
      return Math.sin(x * scale) * Math.cos(y * scale) + 
             Math.sin(x * scale * 2.3) * Math.cos(y * scale * 1.7) * 0.5 +
             Math.sin(x * scale * 4.1) * Math.cos(y * scale * 3.9) * 0.25
    }
    
    // Modify vertices to create cloud-like shapes
    const positions = geometry.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const angle = Math.atan2(y, x)
      const distance = Math.sqrt(x * x + y * y)
      
      // Cloud pattern - more irregular, softer edges
      const cloudNoise1 = noise(x * 0.7, y * 0.7, frequency * 1.5) * blur
      const cloudNoise2 = noise(x * 1.3, y * 1.3, frequency * 0.8) * blur * 0.6
      const cloudNoise3 = noise(x * 2.1, y * 1.9, frequency * 0.5) * blur * 0.3
      
      // Combine multiple noise layers for complex cloud shapes
      const combinedNoise = cloudNoise1 + cloudNoise2 + cloudNoise3
      const cloudDistance = distance * (1 + combinedNoise * 0.5)
      
      // Add directional variation for more natural cloud shapes
      const directionalNoise = Math.sin(angle * 5 + combinedNoise * 3) * blur * 0.3
      const finalDistance = cloudDistance * (1 + directionalNoise)
      
      positions[i] = Math.cos(angle) * finalDistance
      positions[i + 1] = Math.sin(angle) * finalDistance
    }
    
    geometry.attributes.position.needsUpdate = true
    return geometry
  }

  // Helper function to create noise texture for textured clouds
  const createNoiseTexture = (size: number, frequency: number, blur: number, style: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    const imageData = ctx.createImageData(size, size)
    const data = imageData.data
    
    // Simple noise function
    const noise = (x: number, y: number, scale: number) => {
      return Math.sin(x * scale) * Math.cos(y * scale) + 
             Math.sin(x * scale * 2.3) * Math.cos(y * scale * 1.7) * 0.5 +
             Math.sin(x * scale * 4.1) * Math.cos(y * scale * 3.9) * 0.25
    }
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const nx = (x / size - 0.5) * 4
        const ny = (y / size - 0.5) * 4
        
        // Create texture pattern based on style
        const textureIntensity = style - 0.5 // 0-0.5 for solid, 0.5-1 for texture
        
        if (textureIntensity > 0) {
          // Generate noise-based texture pattern
          const noise1 = noise(nx, ny, frequency * 2) * blur
          const noise2 = noise(nx * 1.5, ny * 1.5, frequency * 4) * blur * 0.5
          const noise3 = noise(nx * 3, ny * 3, frequency * 8) * blur * 0.25
          
          const combinedNoise = (noise1 + noise2 + noise3) * textureIntensity * 2
          const brightness = Math.max(0, Math.min(1, 0.5 + combinedNoise))
          
          const pixelIndex = (y * size + x) * 4
          const gray = Math.floor(brightness * 255)
          
          data[pixelIndex] = gray     // R
          data[pixelIndex + 1] = gray // G  
          data[pixelIndex + 2] = gray // B
          data[pixelIndex + 3] = 255  // A
        } else {
          // Solid color for non-textured areas
          const pixelIndex = (y * size + x) * 4
          data[pixelIndex] = 255     // R
          data[pixelIndex + 1] = 255 // G
          data[pixelIndex + 2] = 255 // B
          data[pixelIndex + 3] = 255 // A
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  // Helper function to create true N-sided polyhedra (actual dice shapes)
  const createPolygonGeometry = (radius: number, sides: number) => {
    switch (sides) {
      case 3:
        // 3-sided die = Tetrahedron (4 faces, but called "3-sided")
        return new THREE.TetrahedronGeometry(radius * 1.3)
      
      case 4:
        // 4-sided die = Cube (6 faces showing squares)
        return new THREE.BoxGeometry(radius * 1.2, radius * 1.2, radius * 1.2)
      
      case 5:
        // 5-sided die = Triangular Dipyramid (custom)
        return createTriangularDipyramid(radius)
        
      case 6:
        // 6-sided die = Cube (standard die)
        return new THREE.BoxGeometry(radius * 1.2, radius * 1.2, radius * 1.2)
      
      case 7:
        // 7-sided die = Pentagonal Dipyramid (custom)
        return createPentagonalDipyramid(radius)
        
      case 8:
        // 8-sided die = Octahedron (8 triangular faces)
        return new THREE.OctahedronGeometry(radius * 1.2)
      
      case 9:
        // 9-sided die = Custom polyhedron
        return createCustomPolyhedron(radius, 9)
        
      case 10:
        // 10-sided die = Pentagonal Trapezohedron (custom)
        return createPentagonalTrapezohedron(radius)
      
      case 11:
        // 11-sided die = Custom polyhedron
        return createCustomPolyhedron(radius, 11)
        
      case 12:
        // 12-sided die = Dodecahedron (12 pentagonal faces)
        return new THREE.DodecahedronGeometry(radius)
      
      default:
        // Fallback - use icosahedron for complex shapes
        return new THREE.IcosahedronGeometry(radius)
    }
  }

  // Function to create sharp-edged polygonal dice (no rounded edges)
  const createPolygonalDice = (radius: number, sides: number) => {
    const shape = new THREE.Shape()
    
    // Create polygon shape
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2 // Start from top
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      
      if (i === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    }
    
    // Close the shape
    shape.closePath()
    
    // Extrude to create SHARP 3D dice - NO bevels for crisp edges
    const depthFactor = Math.max(0.5, 1.0 - sides * 0.04) // Good proportions
    const extrudeSettings = {
      depth: radius * depthFactor,
      bevelEnabled: false, // NO beveling for sharp dice edges
      steps: 1, // Minimal steps for clean geometry
      curveSegments: 1 // Sharp corners
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  // Create triangular dipyramid (5-sided die)
  const createTriangularDipyramid = (radius: number) => {
    // Create custom geometry with triangular base and pyramid tops
    const geometry = new THREE.BufferGeometry()
    
    // Define vertices for triangular dipyramid (5 faces)
    const vertices = new Float32Array([
      // Bottom triangle
       radius, 0, -radius * 0.3,     // 0
      -radius * 0.5, radius * 0.866, -radius * 0.3,  // 1  
      -radius * 0.5, -radius * 0.866, -radius * 0.3, // 2
      // Top point
       0, 0, radius * 0.8,           // 3
      // Bottom point  
       0, 0, -radius * 0.8           // 4
    ])
    
    // Define faces (triangles)
    const indices = new Uint16Array([
      0, 1, 3,  // Side face 1
      1, 2, 3,  // Side face 2  
      2, 0, 3,  // Side face 3
      0, 4, 1,  // Bottom face 1
      1, 4, 2,  // Bottom face 2
      2, 4, 0   // Bottom face 3
    ])
    
    geometry.setIndex(indices)
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.computeVertexNormals()
    
    return geometry
  }

  // Create pentagonal dipyramid (7-sided die)  
  const createPentagonalDipyramid = (radius: number) => {
    // For simplicity, use an octahedron scaled differently
    return new THREE.OctahedronGeometry(radius * 1.1, 0)
  }

  // Create pentagonal trapezohedron (10-sided die)
  const createPentagonalTrapezohedron = (radius: number) => {
    // Use dodecahedron as approximation
    return new THREE.DodecahedronGeometry(radius * 0.8)
  }

  // Create custom polyhedron for unusual sided dice
  const createCustomPolyhedron = (radius: number, sides: number) => {
    // Use icosahedron (20 faces) as base for complex shapes
    return new THREE.IcosahedronGeometry(radius, 0)
  }

  // Helper function to create 3D Perlin noise geometry (highly irregular organic blob)
  const createPerlinNoise3DGeometry = (radius: number, frequency: number, blur: number, style: number) => {
    // Create a base icosphere with more subdivisions for better detail
    const baseGeometry = new THREE.IcosahedronGeometry(radius, 3) // 3 subdivisions for more detail
    
    // Get the position attribute to modify vertices
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    // Apply complex multi-octave noise to each vertex for irregularity
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Multi-octave noise for complex, irregular patterns
      const scale1 = frequency * 2
      const scale2 = frequency * 5
      const scale3 = frequency * 10
      
      // Primary noise layer (large features)
      const noise1 = 
        Math.sin(vertex.x * scale1 + vertex.z * scale1 * 0.7) * 
        Math.cos(vertex.y * scale1 + vertex.x * scale1 * 1.3) * 
        Math.sin(vertex.z * scale1 + vertex.y * scale1 * 0.9)
      
      // Secondary noise layer (medium details)
      const noise2 = 
        Math.sin(vertex.x * scale2 + Math.cos(vertex.y * scale2)) * 
        Math.cos(vertex.z * scale2 + Math.sin(vertex.x * scale2)) * 0.5
      
      // Fine detail layer (small irregularities)
      const noise3 = 
        Math.sin(vertex.x * scale3 + vertex.y * scale3 + vertex.z * scale3) * 
        Math.cos(vertex.x * scale3 * 1.7 + vertex.z * scale3 * 0.3) * 0.25
      
      // Combine noise layers for complex organic shape
      const combinedNoise = noise1 + noise2 + noise3
      
      // Apply style parameter - more extreme displacements
      const styleMultiplier = 0.3 + style * 0.7 // Style affects displacement intensity
      const blurFactor = Math.pow(1 - blur, 2) // Exponential blur for more dramatic effect
      
      // More extreme displacement for irregular shapes
      const displacement = combinedNoise * blurFactor * styleMultiplier * radius * 0.6
      
      // Add some randomness based on vertex index for additional irregularity
      const randomFactor = (Math.sin(i * 0.1) + Math.cos(i * 0.17)) * 0.1
      const finalDisplacement = displacement + randomFactor * radius * blurFactor
      
      // Scale the vertex with more dramatic variations
      const length = vertex.length()
      const newLength = length + finalDisplacement
      vertex.normalize().multiplyScalar(Math.max(newLength, radius * 0.2)) // Allow smaller minimum for more extreme shapes
      
      // Update the position
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    // Recalculate normals for proper lighting
    baseGeometry.computeVertexNormals()
    
    return baseGeometry
  }

  // Initialize webcam functionality
  const initializeWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' // Front camera for phones/tablets
        } 
      })
      
      // Create video element
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.muted = true
      video.playsInline = true // Important for mobile devices
      
      webcamVideoRef.current = video
      
      // Create video texture once video is ready to play
      video.addEventListener('canplay', () => {
        console.log('Video can play, creating texture')
        if (webcamVideoRef.current && !webcamTextureRef.current) {
          webcamTextureRef.current = new THREE.VideoTexture(webcamVideoRef.current)
          webcamTextureRef.current.minFilter = THREE.LinearFilter
          webcamTextureRef.current.magFilter = THREE.LinearFilter
          webcamTextureRef.current.format = THREE.RGBAFormat
          webcamTextureRef.current.needsUpdate = true
          console.log('Webcam texture created successfully')
        }
      })
      
      // Ensure video starts playing
      video.play().catch(e => console.log('Video play error:', e))
      
    } catch (error) {
      console.log('Webcam not available:', error)
      // Webcam will fall back to placeholder gray squares
    }
  }


  // Update parameters ref when parameters change
  useEffect(() => {
    shapeParamsRef.current = shapeParams
  }, [shapeParams])

  return (
    <>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      
      {/* FPS Counter */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '80px', // To the left of gear button
        zIndex: 1001,
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        fontFamily: 'monospace',
        backdropFilter: 'blur(5px)'
      }}>
        {fps} FPS
      </div>
      
      {/* Debug Info */}
      <div style={{
        position: 'fixed',
        top: '60px',
        right: '20px',
        zIndex: 1001,
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        backdropFilter: 'blur(5px)'
      }}>
        Shapes: {circleGroupRef.current?.children.length || 0}<br/>
        Diameter: {shapeParams.diameter.toFixed(2)}
      </div>
      
      <ParameterControls
        isVisible={controlsVisible}
        onToggle={() => setControlsVisible(!controlsVisible)}
        
        // Shape type
        shapeType={shapeParams.shapeType}
        onShapeTypeChange={(value) => setShapeParams(prev => ({ ...prev, shapeType: value }))}
        
        // Basic properties
        diameter={shapeParams.diameter}
        color={shapeParams.color}
        intensity={shapeParams.intensity}
        brightness={shapeParams.brightness}
        contrast={shapeParams.contrast}
        transparency={shapeParams.transparency}
        rotation={shapeParams.rotation}
        
        // Tiling
        tilingX={shapeParams.tilingX}
        tilingY={shapeParams.tilingY}
        
        // Movement
        movementDirection={shapeParams.movementDirection}
        movementSpeed={shapeParams.movementSpeed}
        
        // Z-axis recursion
        recursion={shapeParams.recursion}
        recursionMovementDirection={shapeParams.recursionMovementDirection}
        recursionMovementSpeed={shapeParams.recursionMovementSpeed}
        recursionRotation={shapeParams.recursionRotation}
        
        // Mirroring
        radialMirror={shapeParams.radialMirror}
        kaleidoscopeMirror={shapeParams.kaleidoscopeMirror}
        mirrorSegments={shapeParams.mirrorSegments}
        
        // Callbacks
        onDiameterChange={(value) => setShapeParams(prev => ({ ...prev, diameter: value }))}
        onColorChange={(value) => setShapeParams(prev => ({ ...prev, color: value }))}
        onIntensityChange={(value) => setShapeParams(prev => ({ ...prev, intensity: value }))}
        onBrightnessChange={(value) => setShapeParams(prev => ({ ...prev, brightness: value }))}
        onContrastChange={(value) => setShapeParams(prev => ({ ...prev, contrast: value }))}
        onTransparencyChange={(value) => setShapeParams(prev => ({ ...prev, transparency: value }))}
        onRotationChange={(value) => setShapeParams(prev => ({ ...prev, rotation: value }))}
        onTilingXChange={(value) => setShapeParams(prev => ({ ...prev, tilingX: value }))}
        onTilingYChange={(value) => setShapeParams(prev => ({ ...prev, tilingY: value }))}
        onMovementDirectionChange={(value) => setShapeParams(prev => ({ ...prev, movementDirection: value }))}
        onMovementSpeedChange={(value) => setShapeParams(prev => ({ ...prev, movementSpeed: value }))}
        onRecursionChange={(value) => setShapeParams(prev => ({ ...prev, recursion: value }))}
        onRecursionMovementDirectionChange={(value) => setShapeParams(prev => ({ ...prev, recursionMovementDirection: value }))}
        onRecursionMovementSpeedChange={(value) => setShapeParams(prev => ({ ...prev, recursionMovementSpeed: value }))}
        onRecursionRotationChange={(value) => setShapeParams(prev => ({ ...prev, recursionRotation: value }))}
        onRadialMirrorChange={(value) => setShapeParams(prev => ({ ...prev, radialMirror: value }))}
        onKaleidoscopeMirrorChange={(value) => setShapeParams(prev => ({ ...prev, kaleidoscopeMirror: value }))}
        onMirrorSegmentsChange={(value) => setShapeParams(prev => ({ ...prev, mirrorSegments: value }))}
        
        // 3D Camera controls
        // Camera positioning disabled temporarily
        // cameraX={shapeParams.cameraX}
        // cameraY={shapeParams.cameraY}
        // cameraZ={shapeParams.cameraZ}
        // onCameraXChange={(value) => setShapeParams(prev => ({ ...prev, cameraX: value }))}
        // onCameraYChange={(value) => setShapeParams(prev => ({ ...prev, cameraY: value }))}
        // onCameraZChange={(value) => setShapeParams(prev => ({ ...prev, cameraZ: value }))}
        
        // Shape-specific properties
        sides={shapeParams.sides}
        frequency={shapeParams.frequency}
        amplitude={shapeParams.amplitude}
        noiseFrequency={shapeParams.noiseFrequency}
        noiseBlur={shapeParams.noiseBlur}
        noiseStyle={shapeParams.noiseStyle}
        onSidesChange={(value) => setShapeParams(prev => ({ ...prev, sides: value }))}
        onFrequencyChange={(value) => setShapeParams(prev => ({ ...prev, frequency: value }))}
        onAmplitudeChange={(value) => setShapeParams(prev => ({ ...prev, amplitude: value }))}
        onNoiseFrequencyChange={(value) => setShapeParams(prev => ({ ...prev, noiseFrequency: value }))}
        onNoiseBlurChange={(value) => setShapeParams(prev => ({ ...prev, noiseBlur: value }))}
        onNoiseStyleChange={(value) => setShapeParams(prev => ({ ...prev, noiseStyle: value }))}
      />
    </>
  )
}

export default App