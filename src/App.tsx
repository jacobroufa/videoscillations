import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useShapeStore } from './store/shapeStore'
import { calculateGridDimensions, calculateSphereRadius, lerp } from './utils/math'
import { Controls } from './components/Controls'

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const groupRef = useRef<THREE.Group>()
  
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
    
    // Add lighting for 3D spheres
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

    const animate = (time: number = 0) => {
      animationId = requestAnimationFrame(animate)
      animationTime = time * 0.001 // Convert to seconds
      
      updateSpheres()
      renderer.render(scene, camera)
    }

    const updateSpheres = () => {
      if (!groupRef.current) return
      
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
      
      // Calculate grid and sphere size
      const { tilesX, tilesY, spacing } = calculateGridDimensions(viewWidth, viewHeight, parameters.frequency)
      const radius = calculateSphereRadius(Math.min(viewWidth, viewHeight), parameters.frequency)
      
      // Calculate movement offset with infinite wrapping
      const moveAngle = (parameters.movementDirection * Math.PI) / 180
      const continuousMoveX = Math.cos(moveAngle) * animationTime * parameters.movementSpeed * 0.5
      const continuousMoveY = Math.sin(moveAngle) * animationTime * parameters.movementSpeed * 0.5
      const wrappedMoveX = continuousMoveX % spacing
      const wrappedMoveY = continuousMoveY % spacing
      
      // Create sphere grid
      const startX = -viewWidth / 2 - spacing
      const startY = -viewHeight / 2 - spacing
      
      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          const gridX = startX + x * spacing + wrappedMoveX
          const gridY = startY + y * spacing + wrappedMoveY
          
          // Apply rotation around center (0, 0, 0)
          const rotationAngle = animationTime * parameters.rotation * 0.5
          const rotatedX = gridX * Math.cos(rotationAngle) - gridY * Math.sin(rotationAngle)
          const rotatedY = gridX * Math.sin(rotationAngle) + gridY * Math.cos(rotationAngle)
          
          // Create sphere
          const geometry = new THREE.SphereGeometry(radius, 32, 16)
          const material = new THREE.MeshStandardMaterial({
            transparent: true,
            opacity: parameters.transparency,
          })
          
          const sphere = new THREE.Mesh(geometry, material)
          sphere.position.set(rotatedX, rotatedY, 0)
          
          // Set color using HSL
          const hue = parameters.color / 360
          const saturation = parameters.intensity
          const lightness = 0.5
          material.color.setHSL(hue, saturation, lightness)
          
          groupRef.current.add(sphere)
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