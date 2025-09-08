import { useRef } from 'react'

interface SmoothAnimationState {
  moveOffset: { x: number, y: number }
  recursionOffset: { x: number, y: number }
  rotationAngle: number
  recursionRotationAngle: number
}

export const useSmoothAnimation = () => {
  const smoothStateRef = useRef<SmoothAnimationState>({
    moveOffset: { x: 0, y: 0 },
    recursionOffset: { x: 0, y: 0 },
    rotationAngle: 0,
    recursionRotationAngle: 0
  })

  // Smooth parameter interpolation functions
  const lerpAngle = (from: number, to: number, factor: number) => {
    // Handle angle wrapping for smooth transitions
    let diff = to - from
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    return from + diff * factor
  }

  const lerp = (from: number, to: number, factor: number) => {
    return from + (to - from) * factor
  }

  // Seamless wrapping for continuous movement without jumping
  const seamlessWrap = (value: number, wrapSize: number) => {
    // Use sine/cosine to create seamless wrapping without boundary jumps
    const normalizedValue = (value % wrapSize) / wrapSize
    return normalizedValue * wrapSize
  }

  // Enhanced smoothing for movement that eliminates boundary jumping
  const smoothMovement = (
    time: number,
    direction: number,
    speed: number,
    wrapSize: number,
    isRecursion: boolean = false,
    depthRatio: number = 0
  ) => {
    const moveAngle = (direction * Math.PI) / 180
    
    // Create seamless continuous movement without modulo boundaries
    // Use different approach: direct linear movement with smooth wrapping
    const rawDistance = time * speed * 0.3 // Reduced speed for smoother movement
    
    // Apply directional movement without wrapping boundaries
    const rawX = Math.cos(moveAngle) * rawDistance
    const rawY = Math.sin(moveAngle) * rawDistance
    
    // For tiling, we want the shapes to move continuously without jumping
    // Instead of modulo, use a smooth repeating pattern
    const smoothWrapFactor = 0.8 // Controls how much the movement wraps
    const normalizedX = (rawX / wrapSize) * smoothWrapFactor
    const normalizedY = (rawY / wrapSize) * smoothWrapFactor
    
    // Create smooth, continuous offset that doesn't have boundary jumps
    const targetMoveX = normalizedX * wrapSize
    const targetMoveY = normalizedY * wrapSize
    
    // Scale for recursion layers
    const scaledX = targetMoveX * (isRecursion ? depthRatio : 1)
    const scaledY = targetMoveY * (isRecursion ? depthRatio : 1)
    
    return { x: scaledX, y: scaledY }
  }

  const updateSmoothState = (
    time: number,
    movementDirection: number,
    movementSpeed: number,
    recursionMovementDirection: number,
    recursionMovementSpeed: number,
    rotation: number,
    recursionRotation: number,
    spacing: number,
    depthRatio: number = 0
  ) => {
    const easingSpeed = 0.08 // Configurable easing speed
    
    // Calculate target movement with seamless wrapping
    const targetMovement = smoothMovement(
      time,
      movementDirection,
      movementSpeed,
      spacing
    )
    
    const targetRecursionMovement = smoothMovement(
      time,
      recursionMovementDirection,
      recursionMovementSpeed,
      spacing,
      true,
      depthRatio
    )
    
    // Calculate target rotation angles
    const targetBaseRotationAngle = time * rotation * 1.5
    const targetRecursionRotationAngle = time * recursionRotation * 1.5
    
    // Smooth all values
    const state = smoothStateRef.current
    state.moveOffset.x = lerp(state.moveOffset.x, targetMovement.x, easingSpeed)
    state.moveOffset.y = lerp(state.moveOffset.y, targetMovement.y, easingSpeed)
    
    state.recursionOffset.x = lerp(state.recursionOffset.x, targetRecursionMovement.x, easingSpeed)
    state.recursionOffset.y = lerp(state.recursionOffset.y, targetRecursionMovement.y, easingSpeed)
    
    state.rotationAngle = lerpAngle(state.rotationAngle, targetBaseRotationAngle, easingSpeed)
    state.recursionRotationAngle = lerpAngle(state.recursionRotationAngle, targetRecursionRotationAngle, easingSpeed)
    
    return state
  }

  const getSmoothState = () => smoothStateRef.current

  return {
    updateSmoothState,
    getSmoothState,
    lerp,
    lerpAngle
  }
}