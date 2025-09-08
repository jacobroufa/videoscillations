import React from 'react'
import { useShapeStore } from '../store/shapeStore'

export const Controls: React.FC = () => {
  const { parameters, setParameters } = useShapeStore()

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '20px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'monospace',
      minWidth: '200px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Sphere Controls</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Frequency: {parameters.frequency}
        </label>
        <input
          type="range"
          min="2"
          max="20"
          value={parameters.frequency}
          onChange={(e) => setParameters({ frequency: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Color: {parameters.color}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={parameters.color}
          onChange={(e) => setParameters({ color: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Intensity: {parameters.intensity.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={parameters.intensity}
          onChange={(e) => setParameters({ intensity: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Transparency: {parameters.transparency.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={parameters.transparency}
          onChange={(e) => setParameters({ transparency: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Rotation: {parameters.rotation.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={parameters.rotation}
          onChange={(e) => setParameters({ rotation: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Movement Direction: {parameters.movementDirection}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={parameters.movementDirection}
          onChange={(e) => setParameters({ movementDirection: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Movement Speed: {parameters.movementSpeed.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={parameters.movementSpeed}
          onChange={(e) => setParameters({ movementSpeed: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}