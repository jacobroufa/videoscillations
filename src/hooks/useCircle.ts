import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export interface CircleParameters {
  diameter: number
  color: number
  intensity: number
  transparency: number
  rotation: number
}

export const useCircle = (parameters: CircleParameters) => {
  const meshRef = useRef<THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> | undefined>(undefined)
  
  if (!meshRef.current) {
    console.log('Creating initial circle')
    const geometry = new THREE.CircleGeometry(1, 32) // Start with radius 1
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide
    })
    meshRef.current = new THREE.Mesh(geometry, material)
  }

  useEffect(() => {
    if (meshRef.current) {
      // Update geometry if diameter changed
      const newRadius = parameters.diameter / 2
      if (meshRef.current.geometry.parameters.radius !== newRadius) {
        meshRef.current.geometry.dispose()
        meshRef.current.geometry = new THREE.CircleGeometry(newRadius, 32)
      }
      
      // Update material properties
      meshRef.current.material.color.setHSL(parameters.color / 360, 1, parameters.intensity)
      meshRef.current.material.opacity = 1 - parameters.transparency
      meshRef.current.rotation.z = parameters.rotation
    }
  }, [parameters.diameter, parameters.color, parameters.intensity, parameters.transparency, parameters.rotation])

  return meshRef.current
}