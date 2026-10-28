import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { FloorModel } from '../types'
import { useView } from '../store'
import { unitBox } from './geometries'
import { ceilingTexture, graniteTexture } from './textures'
import { Benches } from './Benches'
import { Walls } from './Walls'
import { Columns } from './Columns'
import { FloorItems } from './Items'
import { BenchLabels, PhotoMarkers } from './Markers'
import { CalibrationCamera, CameraRig } from './CameraRig'

export function FloorScene({ model }: { model: FloorModel }) {
  const quality = useView((s) => s.quality)
  const calibration = useView((s) => s.calibration)
  const selectSeat = useView((s) => s.selectSeat)
  const high = quality === 'high'

  return (
    <Canvas
      shadows={high ? 'percentage' : false}
      dpr={high ? [1, 2] : [1, 1.25]}
      camera={{ fov: 35, near: 0.1, far: 600, position: [model.width / 2 + 30, 52, model.depth / 2 + 44] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
      }}
      onPointerMissed={() => selectSeat(null)}
    >
      <color attach="background" args={['#dde3ea']} />
      <Lighting width={model.width} depth={model.depth} shadows={high} />
      <FloorSlab width={model.width} depth={model.depth} />
      <Walls walls={model.walls} items={model.items} />
      <Columns columns={model.columns} />
      <Benches benches={model.benches} seats={model.seats} />
      <FloorItems items={model.items} />
      <BenchLabels benches={model.benches} />
      <PhotoMarkers photos={model.photos} />
      {calibration ? (
        <>
          <Ceiling width={model.width} depth={model.depth} height={model.ceilingHeight} />
          <CalibrationCamera pose={calibration.pose} />
        </>
      ) : (
        <CameraRig width={model.width} depth={model.depth} />
      )}
      {high && (
        <EffectComposer multisampling={4}>
          <N8AO halfRes aoRadius={0.9} distanceFalloff={0.6} intensity={2.2} quality="medium" />
          <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

/**
 * Luz geral + uma direcional para sombras suaves. O ambiente é procedural
 * (painéis de luz no "teto"), o que dá ao granito o reflexo das luminárias.
 */
function Lighting({ width, depth, shadows }: { width: number; depth: number; shadows: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null)
  const cx = width / 2
  const cz = depth / 2
  const half = Math.max(width, depth) * 0.75

  useLayoutEffect(() => {
    const l = light.current
    if (!l) return
    l.target.position.set(cx, 0, cz)
    l.target.updateMatrixWorld()
  }, [cx, cz])

  const panels = useMemo(() => {
    const out: [number, number][] = []
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) out.push([i * 5, j * 5])
    return out
  }, [])

  return (
    <>
      <hemisphereLight args={['#ffffff', '#cfc8bd', 0.85]} />
      <directionalLight
        ref={light}
        position={[cx - 16, 36, cz - 12]}
        intensity={1.5}
        castShadow={shadows}
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={120}
      />
      <Environment resolution={256} frames={1} environmentIntensity={0.55}>
        <color attach="background" args={['#b4bcc3']} />
        {panels.map(([x, z]) => (
          <Lightformer key={`${x},${z}`} form="rect" intensity={2.4} color="#ffffff" position={[x, 6, z]} rotation-x={Math.PI / 2} scale={[2.6, 0.5, 1]} />
        ))}
        <Lightformer form="rect" intensity={0.6} color="#dfe6ee" position={[0, 2, -14]} scale={[30, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#dfe6ee" position={[0, 2, 14]} rotation-y={Math.PI} scale={[30, 4, 1]} />
      </Environment>
    </>
  )
}

function FloorSlab({ width, depth }: { width: number; depth: number }) {
  const materials = useMemo(() => {
    const tex = graniteTexture().clone()
    tex.repeat.set(width / 1.6, depth / 1.6)
    tex.needsUpdate = true
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, metalness: 0 })
    const edge = new THREE.MeshStandardMaterial({ color: '#7c8186', roughness: 0.9 })
    return [edge, edge, top, edge, edge, edge]
  }, [width, depth])
  return <mesh geometry={unitBox} material={materials} position={[width / 2, -0.15, depth / 2]} scale={[width, 0.3, depth]} receiveShadow />
}

/** Forro com luminárias — só aparece na calibração, quando a câmera fica "dentro" do andar. */
function Ceiling({ width, depth, height }: { width: number; depth: number; height: number }) {
  const material = useMemo(() => {
    const tex = ceilingTexture().clone()
    tex.repeat.set(width / 5, depth / 5)
    tex.needsUpdate = true
    return new THREE.MeshBasicMaterial({ map: tex, color: '#e4e7e8', side: THREE.DoubleSide })
  }, [width, depth])
  return (
    <mesh position={[width / 2, height, depth / 2]} rotation-x={Math.PI / 2} material={material}>
      <planeGeometry args={[width, depth]} />
    </mesh>
  )
}
