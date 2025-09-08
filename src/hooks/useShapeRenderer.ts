import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import { ShapeType, ShapeParameters } from '../store/shapeStore'

export const useShapeRenderer = () => {
  const textureCache = useRef<Map<string, THREE.CanvasTexture>>(new Map())
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const webcamTextureRef = useRef<THREE.VideoTexture | null>(null)

  // Initialize webcam functionality
  const initializeWebcam = useCallback(async () => {
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
  }, [])

  // Create shape mesh based on type
  const createShapeMesh = useCallback((
    shapeType: ShapeType,
    radius: number,
    opacity: number,
    params: ShapeParameters
  ): THREE.Mesh => {
    let geometry: THREE.BufferGeometry
    
    switch (shapeType) {
      case 'circle':
        geometry = new THREE.CircleGeometry(radius, 32)
        break
      
      case 'polygon':
        const sides = params.sides || 6
        geometry = new THREE.CircleGeometry(radius, sides)
        break
      
      case 'sin-wave':
        geometry = createSinWaveGeometry(radius, params.frequency || 1, params.amplitude || 1)
        break
      
      case 'tan-wave':
        geometry = createTanWaveGeometry(radius, params.frequency || 1, params.amplitude || 1)
        break
      
      case 'perlin-noise':
        const noiseStyle = params.noiseStyle || 0
        geometry = createPerlinNoiseGeometry(radius, params.noiseFrequency || 1, params.noiseBlur || 0.5, noiseStyle)
        
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
    
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    })
    
    return new THREE.Mesh(geometry, material)
  }, [])

  // Helper function to create sin wave geometry
  const createSinWaveGeometry = useCallback((radius: number, frequency: number, amplitude: number) => {
    const segments = 128
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []
    
    // Calculate full viewport width at camera distance with extra margin
    const viewDistance = 5 // Camera distance
    const viewHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * viewDistance
    const viewWidth = viewHeight * (window.innerWidth / window.innerHeight)
    const extendedWidth = viewWidth * 3 // Even wider for complete coverage
    
    // Create a straight line edge-to-edge with sin wave modulating thickness
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * extendedWidth // Extended viewport width
      const t = x * frequency // Position along line affects wave
      const thickness = (Math.sin(t) * amplitude + 1) * radius * 0.2 // Sin wave controls thickness
      
      // Create vertices in XY plane with thickness as width (Y direction)
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
  }, [])

  // Helper function to create tan wave geometry
  const createTanWaveGeometry = useCallback((radius: number, frequency: number, amplitude: number) => {
    const segments = 128
    const geometry = new THREE.BufferGeometry()
    const vertices: number[] = []
    const indices: number[] = []
    
    // Calculate full viewport width at camera distance with extra margin
    const viewDistance = 5 // Camera distance
    const viewHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * viewDistance
    const viewWidth = viewHeight * (window.innerWidth / window.innerHeight)
    const extendedWidth = viewWidth * 3 // Even wider for complete coverage
    
    // Create a straight line edge-to-edge with tan wave modulating thickness
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * extendedWidth // Extended viewport width
      const t = x * frequency // Position along line affects wave
      
      // Use tan for thickness but clamp to avoid infinity
      const tanValue = Math.tan(t * 0.5) // Reduced to avoid extreme values
      const thickness = Math.max(0.01, Math.min(radius * 0.5, Math.abs(tanValue) * amplitude * radius * 0.1))
      
      // Create vertices in XY plane with thickness as width (Y direction)
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
  }, [])

  // Helper function to create perlin noise geometry (cloud shapes)
  const createPerlinNoiseGeometry = useCallback((radius: number, frequency: number, blur: number, style: number) => {
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
  }, [])

  // Helper function to create noise texture for textured clouds
  const createNoiseTexture = useCallback((size: number, frequency: number, blur: number, style: number) => {
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
  }, [])

  const cleanup = useCallback(() => {
    // Cleanup webcam
    if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
      const tracks = (webcamVideoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    if (webcamTextureRef.current) {
      webcamTextureRef.current.dispose()
    }

    // Cleanup texture cache
    textureCache.current.forEach(texture => texture.dispose())
    textureCache.current.clear()
  }, [])

  return {
    createShapeMesh,
    initializeWebcam,
    cleanup
  }
}