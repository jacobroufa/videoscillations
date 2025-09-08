import React from 'react'
import { ShapeType } from '../store/shapeStore'

export interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 0.01, onChange }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '4px',
        fontSize: '14px',
        color: 'white'
      }}>
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.3)',
          outline: 'none',
          borderRadius: '2px'
        }}
      />
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

const Toggle: React.FC<ToggleProps> = ({ label, value, onChange }) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '14px',
        color: 'white'
      }}>
        <span>{label}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            width: '20px',
            height: '20px',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  )
}

export interface ParameterControlsProps {
  isVisible: boolean
  onToggle: () => void
  
  // Shape type
  shapeType?: ShapeType
  onShapeTypeChange?: (value: ShapeType) => void
  
  // Basic properties
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
  movementDirection: number
  movementSpeed: number
  
  // Z-axis recursion
  recursion: number
  recursionMovementDirection: number
  recursionMovementSpeed: number
  recursionRotation: number
  
  // Mirroring
  radialMirror: boolean
  kaleidoscopeMirror: boolean
  mirrorSegments: number
  
  // 3D Camera controls
  cameraX: number
  cameraY: number
  cameraZ: number
  
  // Shape-specific properties
  sides?: number
  frequency?: number
  amplitude?: number
  noiseFrequency?: number
  noiseBlur?: number
  noiseStyle?: number
  onSidesChange?: (value: number) => void
  onFrequencyChange?: (value: number) => void
  onAmplitudeChange?: (value: number) => void
  onNoiseFrequencyChange?: (value: number) => void
  onNoiseBlurChange?: (value: number) => void
  onNoiseStyleChange?: (value: number) => void
  
  // Callbacks
  onDiameterChange: (value: number) => void
  onColorChange: (value: number) => void
  onIntensityChange: (value: number) => void
  onBrightnessChange: (value: number) => void
  onContrastChange: (value: number) => void
  onTransparencyChange: (value: number) => void
  onRotationChange: (value: number) => void
  onTilingXChange: (value: number) => void
  onTilingYChange: (value: number) => void
  onMovementDirectionChange: (value: number) => void
  onMovementSpeedChange: (value: number) => void
  onRecursionChange: (value: number) => void
  onRecursionMovementDirectionChange: (value: number) => void
  onRecursionMovementSpeedChange: (value: number) => void
  onRecursionRotationChange: (value: number) => void
  onRadialMirrorChange: (value: boolean) => void
  onKaleidoscopeMirrorChange: (value: boolean) => void
  onMirrorSegmentsChange: (value: number) => void
  onCameraXChange: (value: number) => void
  onCameraYChange: (value: number) => void
  onCameraZChange: (value: number) => void
}

const ParameterControls: React.FC<ParameterControlsProps> = ({
  isVisible,
  onToggle,
  
  // Shape type
  shapeType = 'circle',
  onShapeTypeChange,
  
  // Basic properties
  diameter,
  color,
  intensity,
  brightness,
  contrast,
  transparency,
  rotation,
  
  // Tiling
  tilingX,
  tilingY,
  
  // Movement
  movementDirection,
  movementSpeed,
  
  // Z-axis recursion
  recursion,
  recursionMovementDirection,
  recursionMovementSpeed,
  recursionRotation,
  
  // Mirroring
  radialMirror,
  kaleidoscopeMirror,
  mirrorSegments,
  
  // 3D Camera controls
  cameraX,
  cameraY,
  cameraZ,
  
  // Shape-specific properties
  sides = 6,
  frequency = 1,
  amplitude = 1,
  noiseFrequency = 1,
  noiseBlur = 0.5,
  noiseStyle = 0,
  onSidesChange,
  onFrequencyChange,
  onAmplitudeChange,
  onNoiseFrequencyChange,
  onNoiseBlurChange,
  onNoiseStyleChange,
  
  // Callbacks
  onDiameterChange,
  onColorChange,
  onIntensityChange,
  onBrightnessChange,
  onContrastChange,
  onTransparencyChange,
  onRotationChange,
  onTilingXChange,
  onTilingYChange,
  onMovementDirectionChange,
  onMovementSpeedChange,
  onRecursionChange,
  onRecursionMovementDirectionChange,
  onRecursionMovementSpeedChange,
  onRecursionRotationChange,
  onRadialMirrorChange,
  onKaleidoscopeMirrorChange,
  onMirrorSegmentsChange,
  onCameraXChange,
  onCameraYChange,
  onCameraZChange
}) => {
  return (
    <>
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1001,
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ⚙️
      </button>
      
      {isVisible && (
        <div style={{
          position: 'fixed',
          top: '0',
          right: '0',
          width: '320px',
          height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          padding: '80px 20px 20px',
          zIndex: 1000,
          overflowY: 'auto'
        }}>
          <h3 style={{ color: 'white', marginBottom: '24px', fontSize: '18px' }}>
            Shape Parameters
          </h3>
          
          {/* Shape Type Selector */}
          <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '0px' }}>
            Shape Type
          </h4>
          <div style={{ marginBottom: '24px' }}>
            <select
              value={shapeType}
              onChange={(e) => onShapeTypeChange?.(e.target.value as ShapeType)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '14px'
              }}
            >
              <option value="circle">Circle</option>
              <option value="polygon">Polygon</option>
              <option value="sin-wave">Sin Wave</option>
              <option value="tan-wave">Tan Wave</option>
              <option value="perlin-noise">Perlin Noise</option>
              <option value="webcam">Webcam</option>
            </select>
          </div>
          
          {/* Basic Properties */}
          <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
            Basic Properties
          </h4>
          <Slider
            label="Diameter"
            value={diameter}
            min={0.1}
            max={5}
            onChange={onDiameterChange}
          />
          <Slider
            label="Color (Hue)"
            value={color}
            min={0}
            max={360}
            step={1}
            onChange={onColorChange}
          />
          <Slider
            label="Intensity"
            value={intensity}
            min={0}
            max={1}
            onChange={onIntensityChange}
          />
          <Slider
            label="Brightness"
            value={brightness}
            min={0}
            max={1}
            onChange={onBrightnessChange}
          />
          <Slider
            label="Contrast"
            value={contrast}
            min={0}
            max={2}
            onChange={onContrastChange}
          />
          <Slider
            label="Opacity"
            value={transparency}
            min={0}
            max={1}
            onChange={onTransparencyChange}
          />
          <Slider
            label="Rotation"
            value={rotation}
            min={-0.15}
            max={0.15}
            onChange={onRotationChange}
          />

          {/* Tiling is now automatic - no controls needed */}

          {/* Movement */}
          <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
            Movement
          </h4>
          <Slider
            label="Movement Direction"
            value={movementDirection}
            min={0}
            max={360}
            step={1}
            onChange={onMovementDirectionChange}
          />
          <Slider
            label="Movement Speed"
            value={movementSpeed}
            min={0}
            max={2}
            onChange={onMovementSpeedChange}
          />

          {/* Z-axis Recursion */}
          <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
            Z-axis Recursion
          </h4>
          <Slider
            label="Recursion"
            value={recursion}
            min={0}
            max={1}
            onChange={onRecursionChange}
          />
          <Slider
            label="Recursion Movement Direction"
            value={recursionMovementDirection}
            min={0}
            max={360}
            step={1}
            onChange={onRecursionMovementDirectionChange}
          />
          <Slider
            label="Recursion Movement Speed"
            value={recursionMovementSpeed}
            min={0}
            max={2}
            onChange={onRecursionMovementSpeedChange}
          />
          <Slider
            label="Recursion Rotation"
            value={recursionRotation}
            min={-0.15}
            max={0.15}
            onChange={onRecursionRotationChange}
          />

          {/* Mirroring */}
          <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
            Mirroring
          </h4>
          <Toggle
            label="Radial Mirror"
            value={radialMirror}
            onChange={onRadialMirrorChange}
          />
          <Toggle
            label="Kaleidoscope Mirror"
            value={kaleidoscopeMirror}
            onChange={onKaleidoscopeMirrorChange}
          />
          <Slider
            label="Mirror Segments"
            value={mirrorSegments}
            min={3}
            max={16}
            step={1}
            onChange={onMirrorSegmentsChange}
          />

          {/* Shape-Specific Controls */}
          {shapeType === 'polygon' && (
            <>
              <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
                Polygon Properties
              </h4>
              <Slider
                label="Sides"
                value={sides}
                min={3}
                max={12}
                step={1}
                onChange={onSidesChange || (() => {})}
              />
            </>
          )}

          {(shapeType === 'sin-wave' || shapeType === 'tan-wave') && (
            <>
              <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
                Wave Properties
              </h4>
              <Slider
                label="Frequency"
                value={frequency}
                min={0.1}
                max={5}
                onChange={onFrequencyChange || (() => {})}
              />
              <Slider
                label="Amplitude"
                value={amplitude}
                min={0.1}
                max={2}
                onChange={onAmplitudeChange || (() => {})}
              />
            </>
          )}

          {shapeType === 'perlin-noise' && (
            <>
              <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
                Noise Properties
              </h4>
              <Slider
                label="Noise Frequency"
                value={noiseFrequency}
                min={0.1}
                max={5}
                onChange={onNoiseFrequencyChange || (() => {})}
              />
              <Slider
                label="Noise Blur"
                value={noiseBlur}
                min={0}
                max={1}
                onChange={onNoiseBlurChange || (() => {})}
              />
              <Slider
                label="Style (Cloud ↔ Texture)"
                value={noiseStyle}
                min={0}
                max={1}
                onChange={onNoiseStyleChange || (() => {})}
              />
            </>
          )}

          {/* 3D Camera Controls - Temporarily Disabled */}
          {/* <h4 style={{ color: '#aaa', marginBottom: '16px', fontSize: '14px', marginTop: '24px' }}>
            3D Camera Position
          </h4>
          <Slider
            label="X Position (Left/Right)"
            value={cameraX}
            min={-10}
            max={10}
            onChange={onCameraXChange}
          />
          <Slider
            label="Y Position (Up/Down)"
            value={cameraY}
            min={-10}
            max={10}
            onChange={onCameraYChange}
          />
          <Slider
            label="Z Position (Distance)"
            value={cameraZ}
            min={-20}
            max={20}
            onChange={onCameraZChange}
          /> */}
        </div>
      )}
    </>
  )
}

export default ParameterControls