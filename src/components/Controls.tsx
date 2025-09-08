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
      <h3 style={{ margin: '0 0 20px 0', fontSize: '16px' }}>Shape Controls</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Frequency: {parameters.frequency}
        </label>
        <input
          type="range"
          min="0"
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
          min="-2.5"
          max="2.5"
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

      <h3 style={{ margin: '20px 0 15px 0', fontSize: '16px', borderTop: '1px solid #444', paddingTop: '15px' }}>Feedback Controls</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Gain: {parameters.gain}
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={parameters.gain}
          onChange={(e) => setParameters({ gain: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
          Global Color: {parameters.globalColor}°
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={parameters.globalColor}
          onChange={(e) => setParameters({ globalColor: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      <h3 style={{ margin: '20px 0 15px 0', fontSize: '16px', borderTop: '1px solid #444', paddingTop: '15px' }}>Feedback Effects</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={parameters.recursiveFeedback}
            onChange={(e) => setParameters({ recursiveFeedback: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Recursive/Fractal
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={parameters.colorBleeding}
            onChange={(e) => setParameters({ colorBleeding: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Color Bleeding
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={parameters.motionTrails}
            onChange={(e) => setParameters({ motionTrails: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Motion Trails
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={parameters.bloomGlow}
            onChange={(e) => setParameters({ bloomGlow: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Bloom/Glow
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={parameters.multipleExposure}
            onChange={(e) => setParameters({ multipleExposure: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          Multiple Exposure
        </label>
      </div>
    </div>
  )
}