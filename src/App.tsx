import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useShapeStore } from './store/shapeStore'
import { calculateSphereRadius, calculateCircularFieldDimensions, lerp } from './utils/math'
import { Controls } from './components/Controls'

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const trailPoolRef = useRef<THREE.Mesh[]>([])
  
  const { parameters } = useShapeStore()

  useEffect(() => {
    if (!mountRef.current) return

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x111111)
    
    // Add lighting for 3D spheres (will be updated based on gain)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(0, 0, 10)
    
    scene.add(ambientLight)
    scene.add(mainLight)
    
    mountRef.current.appendChild(renderer.domElement)
    camera.position.z = 5
    
    // Create group for all spheres
    const group = new THREE.Group()
    scene.add(group)
    
    // Store references
    sceneRef.current = scene
    rendererRef.current = renderer  
    cameraRef.current = camera
    groupRef.current = group

    // Animation state
    let animationTime = 0
    let animationId: number
    
    // Eased parameter state for smooth transitions
    let easedRotation = parameters.rotation
    let easedMovementSpeed = parameters.movementSpeed
    let easedMovementDirection = parameters.movementDirection
    
    // Track cumulative position to prevent jumping
    let cumulativeRotation = 0
    let cumulativeMoveX = 0
    let cumulativeMoveY = 0

    const animate = (time: number = 0) => {
      animationId = requestAnimationFrame(animate)
      animationTime = time * 0.001 // Convert to seconds
      
      // Apply easing to rotation and movement parameters for smooth transitions
      const easingSpeed = 0.05 // Adjust this value for slower/faster easing
      easedRotation = lerp(easedRotation, parameters.rotation, easingSpeed)
      easedMovementSpeed = lerp(easedMovementSpeed, parameters.movementSpeed, easingSpeed)
      easedMovementDirection = lerp(easedMovementDirection, parameters.movementDirection, easingSpeed)
      
      // Calculate incremental changes to prevent field jumping
      const deltaTime = 1/60 // Assume 60fps for consistent increments
      cumulativeRotation += easedRotation * deltaTime * 0.5
      
      const moveAngle = (easedMovementDirection * Math.PI) / 180
      const deltaX = Math.cos(moveAngle) * easedMovementSpeed * deltaTime * 0.5
      const deltaY = Math.sin(moveAngle) * easedMovementSpeed * deltaTime * 0.5
      cumulativeMoveX += deltaX
      cumulativeMoveY += deltaY
      
      updateSpheres()
      renderer.render(scene, camera)
    }

    const updateSpheres = () => {
      if (!groupRef.current || !sceneRef.current) return
      
      // Comprehensive gain control system (base = +50)
      const gainValue = parameters.gain
      const gainFromBase = gainValue - 50 // -150 to +50 range
      const normalizedGain = gainFromBase / 50 // -3 to +1 range
      
      const ambientLight = sceneRef.current.children.find(child => child instanceof THREE.AmbientLight) as THREE.AmbientLight
      const mainLight = sceneRef.current.children.find(child => child instanceof THREE.DirectionalLight) as THREE.DirectionalLight
      
      if (ambientLight && mainLight) {
        // Scene lighting contrast/brightness
        const baseAmbient = 0.8
        const baseMain = 1.2
        
        if (gainValue >= 50) {
          // Positive from base: increase brightness
          const boost = (gainValue - 50) / 50 // 0 to 1
          ambientLight.intensity = baseAmbient + boost * 0.5
          mainLight.intensity = baseMain + boost * 1.0
        } else {
          // Negative from base: decrease brightness, prepare for inversion
          const reduction = (50 - gainValue) / 150 // 0 to 1 (when gain goes to -100)
          ambientLight.intensity = Math.max(0.2, baseAmbient - reduction * 0.6)
          mainLight.intensity = Math.max(0.3, baseMain - reduction * 0.9)
        }
        
        // Update background color for color inversion effect
        if (rendererRef.current) {
          if (gainValue < 0) {
            // Negative gain: background takes the shape color
            const globalHue = parameters.globalColor / 360
            const individualOffset = parameters.color / 360
            const bgHue = (globalHue + individualOffset) % 1
            const bgColor = new THREE.Color().setHSL(bgHue, parameters.intensity, parameters.intensity * 0.5)
            rendererRef.current.setClearColor(bgColor)
          } else {
            // Positive gain: normal dark background
            rendererRef.current.setClearColor(0x111111)
          }
        }
      }
      
      // Clear existing spheres
      while (groupRef.current.children.length > 0) {
        const child = groupRef.current.children[0]
        groupRef.current.remove(child)
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
      
      // Calculate viewport dimensions at z=0
      const viewHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * 5
      const viewWidth = viewHeight * (window.innerWidth / window.innerHeight)
      
      // Calculate circular field for optimal coverage during rotation
      const { tilesX, tilesY, spacing, radius: fieldRadius } = calculateCircularFieldDimensions(viewWidth, viewHeight, parameters.frequency)
      const sphereRadius = calculateSphereRadius(Math.min(viewWidth, viewHeight), parameters.frequency)
      
      // Use cumulative movement for smooth transitions without jumping
      const wrappedMoveX = cumulativeMoveX % spacing
      const wrappedMoveY = cumulativeMoveY % spacing
      
      // Create sphere grid with circular culling for optimal coverage
      const startX = -fieldRadius
      const startY = -fieldRadius
      
      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          const gridX = startX + x * spacing + wrappedMoveX
          const gridY = startY + y * spacing + wrappedMoveY
          
          // Apply rotation around center (0, 0, 0) using cumulative rotation
          const rotationAngle = cumulativeRotation
          const rotatedX = gridX * Math.cos(rotationAngle) - gridY * Math.sin(rotationAngle)
          const rotatedY = gridX * Math.sin(rotationAngle) + gridY * Math.cos(rotationAngle)
          
          // Only render spheres within the circular field for optimization
          const distanceFromCenter = Math.sqrt(rotatedX * rotatedX + rotatedY * rotatedY)
          if (distanceFromCenter > fieldRadius) continue
          
          // Create sphere with gain-affected properties
          const geometry = new THREE.SphereGeometry(sphereRadius, 32, 16)
          const material = new THREE.MeshStandardMaterial({
            transparent: true,
            opacity: parameters.transparency,
          })
          
          // Calculate gain effects
          const gainValue = parameters.gain
          const isNegativeGain = gainValue < 0
          const isExtremeGain = Math.abs(gainValue - 50) > 50 // Beyond ±50 from base
          
          // Base color calculation
          const globalHue = parameters.globalColor / 360
          const individualOffset = parameters.color / 360
          let finalHue = (globalHue + individualOffset) % 1
          let saturation = parameters.intensity
          let lightness = parameters.intensity * 0.5
          
          // Normal coloring first
          material.color.setHSL(finalHue, saturation, lightness)
          
          // Emissiveness for extreme gain values
          if (isExtremeGain) {
            const extremeIntensity = (Math.abs(gainValue - 50) - 50) / 50 // 0 to 1
            const emissiveIntensity = extremeIntensity * 0.3
            material.emissive.setHSL(finalHue, saturation * 0.7, emissiveIntensity)
          } else {
            material.emissive.setHex(0x000000) // No emissiveness
          }
          
          const sphere = new THREE.Mesh(geometry, material)
          
          // Feedback/distortion effects at extreme ends
          let finalX = rotatedX
          let finalY = rotatedY
          
          if (Math.abs(gainValue) > 75) {
            const distortionFactor = (Math.abs(gainValue) - 75) / 25 // 0 to 1
            const time = cumulativeRotation * 2
            const distortX = Math.sin(time + finalX * 0.1) * distortionFactor * sphereRadius * 0.5
            const distortY = Math.cos(time + finalY * 0.1) * distortionFactor * sphereRadius * 0.5
            finalX += distortX
            finalY += distortY
          }
          
          sphere.position.set(finalX, finalY, 0)
          groupRef.current.add(sphere)
          
          // Feedback Effects Implementation
          // 1. Recursive/Fractal Feedback - spawn echo spheres based on gain intensity
          if (parameters.recursiveFeedback && Math.abs(gainValue - 50) >= 25) {
            const gainIntensity = Math.abs(gainValue - 50) / 50 // 0.5 to 1 range
            const echoCount = Math.floor(2 + gainIntensity * 4) // 2-6 echoes
            const echoRadius = sphereRadius * (0.4 + gainIntensity * 0.3)
            
            for (let i = 0; i < echoCount; i++) {
              const angle = (i / echoCount) * Math.PI * 2
              const distance = sphereRadius * (3 + gainIntensity * 2) // Much more separated
              const echoX = finalX + Math.cos(angle + cumulativeRotation * 0.5) * distance
              const echoY = finalY + Math.sin(angle + cumulativeRotation * 0.5) * distance
              
              const echoGeometry = new THREE.SphereGeometry(echoRadius, 16, 8)
              const echoMaterial = material.clone()
              echoMaterial.opacity = parameters.transparency * 0.8
              echoMaterial.transparent = true
              
              const echoSphere = new THREE.Mesh(echoGeometry, echoMaterial)
              echoSphere.position.set(echoX, echoY, 0)
              
              // Only add if within field radius
              const echoDistance = Math.sqrt(echoX * echoX + echoY * echoY)
              if (echoDistance <= fieldRadius) {
                groupRef.current.add(echoSphere)
              }
            }
          }
          
          // 2. Color/Intensity Bleeding - saturation and lightness variation only
          if (parameters.colorBleeding && !isNegativeGain && Math.abs(gainValue - 50) >= 25) {
            const gainIntensity = Math.abs(gainValue - 50) / 50 // 0.5 to 1 range
            const bleedSat = Math.min(1, saturation + Math.cos(cumulativeRotation * 0.15 + finalY * 0.008) * gainIntensity)
            const bleedLight = Math.max(0, Math.min(1, lightness + Math.sin(cumulativeRotation * 0.1 + finalX * 0.006) * gainIntensity * 0.8))
            material.color.setHSL(finalHue, bleedSat, bleedLight) // Keep original hue
          }
          
          // FINAL Color inversion for negative gain - override any previous color settings
          if (isNegativeGain) {
            material.color.setHex(0x000000) // Force pure black for negative gain
          }
          
          // 3. Motion Trails - optimized with reduced geometry creation
          if (parameters.motionTrails && Math.abs(gainValue - 50) >= 25) {
            const gainIntensity = Math.abs(gainValue - 50) / 50 // 0.5 to 1 range
            const trailCount = Math.floor(2 + gainIntensity * 4) // 2-6 trails
            const moveAngle = (easedMovementDirection * Math.PI) / 180
            const movementVelX = Math.cos(moveAngle) * easedMovementSpeed * 0.5
            const movementVelY = Math.sin(moveAngle) * easedMovementSpeed * 0.5
            
            // Create single shared geometry for all trails of this sphere
            const baseTrailGeometry = new THREE.SphereGeometry(sphereRadius * 0.8, 12, 8) // Lower poly
            
            for (let t = 1; t <= trailCount; t++) {
              const trailFactor = t / trailCount
              
              // Create trail offset - if there's movement/rotation, use it; otherwise create static pattern
              let trailOffsetX = 0
              let trailOffsetY = 0
              
              if (easedMovementSpeed > 0 || Math.abs(easedRotation) > 0) {
                // Dynamic trails based on movement
                trailOffsetX = -movementVelX * trailFactor * spacing * (0.3 + gainIntensity * 0.3)
                trailOffsetY = -movementVelY * trailFactor * spacing * (0.3 + gainIntensity * 0.3)
                
                // Also account for rotational trails
                const rotationTrailOffset = Math.abs(easedRotation) * trailFactor * spacing * (0.2 + gainIntensity * 0.4)
                const rotAngle = cumulativeRotation - easedRotation * trailFactor
                trailOffsetX += rotationTrailOffset * Math.cos(rotAngle)
                trailOffsetY += rotationTrailOffset * Math.sin(rotAngle)
              } else {
                // Static trail pattern when no movement
                const staticAngle = (t / trailCount) * Math.PI * 2
                const staticDistance = sphereRadius * (1 + trailFactor) * gainIntensity * 0.8
                trailOffsetX = Math.cos(staticAngle + cumulativeRotation * 0.1) * staticDistance
                trailOffsetY = Math.sin(staticAngle + cumulativeRotation * 0.1) * staticDistance
              }
              
              const trailX = finalX + trailOffsetX
              const trailY = finalY + trailOffsetY
              
              // Reuse geometry, only create material
              const trailMaterial = new THREE.MeshStandardMaterial({
                color: material.color,
                transparent: true,
                opacity: parameters.transparency * (1 - trailFactor * 0.7) * gainIntensity
              })
              
              const trailSphere = new THREE.Mesh(baseTrailGeometry, trailMaterial)
              trailSphere.position.set(trailX, trailY, -t * 0.05)
              trailSphere.scale.setScalar(1 - trailFactor * 0.4) // Scale instead of new geometry
              
              const trailDistance = Math.sqrt(trailX * trailX + trailY * trailY)
              if (trailDistance <= fieldRadius) {
                groupRef.current.add(trailSphere)
              }
            }
          }
          
          // 4. Bloom/Glow Effect - bright halos at extreme gain values
          if (parameters.bloomGlow && Math.abs(gainValue) >= 75) {
            const glowIntensity = (Math.abs(gainValue) - 75) / 25 // 0 to 1
            const glowRadius = sphereRadius * (1.5 + glowIntensity)
            
            const glowGeometry = new THREE.SphereGeometry(glowRadius, 16, 8)
            const glowMaterial = new THREE.MeshStandardMaterial({
              color: material.color,
              transparent: true,
              opacity: parameters.transparency * 0.2 * glowIntensity,
              emissive: material.color,
              emissiveIntensity: glowIntensity * 0.5
            })
            
            const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial)
            glowSphere.position.copy(sphere.position)
            
            if (groupRef.current) groupRef.current.add(glowSphere)
          }
          
          // 5. Multiple Exposure Effect - overlapping copies at extreme gain values
          if (parameters.multipleExposure && Math.abs(gainValue) >= 75) {
            const exposureIntensity = (Math.abs(gainValue) - 75) / 25 // 0 to 1
            const exposureCount = Math.floor(2 + exposureIntensity * 3) // 2-5 exposures
            
            for (let e = 1; e <= exposureCount; e++) {
              const exposureOffset = sphereRadius * 0.3 * e * exposureIntensity
              const angle = (e / exposureCount) * Math.PI * 2
              const expX = finalX + Math.cos(angle) * exposureOffset
              const expY = finalY + Math.sin(angle) * exposureOffset
              
              const exposureSphere = sphere.clone()
              exposureSphere.material = material.clone()
              exposureSphere.material.opacity = parameters.transparency * (1 - e * 0.15) * 0.4
              exposureSphere.position.set(expX, expY, e * 0.01)
              
              if (groupRef.current) groupRef.current.add(exposureSphere)
            }
          }
        }
      }
    }

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [parameters])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mountRef} />
      <Controls />
    </div>
  )
}

export default App