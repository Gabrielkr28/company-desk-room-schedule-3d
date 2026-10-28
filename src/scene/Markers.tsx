import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { Bench, Photo } from '../types'
import { useView } from '../store'
import { DEG } from './math'
import { labelTexture } from './textures'
import { photoColor } from './photoColors'


/** Rótulo flutuante com o ID de cada bancada. */
export function BenchLabels({ benches }: { benches: Bench[] }) {
  const show = useView((s) => s.showLabels && !s.calibration)
  if (!show) return null
  return (
    <>
      {benches.map((b) => (
        <sprite key={b.id} position={[b.center[0], 1.55, b.center[1]]} scale={[0.9, 0.45, 1]}>
          <spriteMaterial map={labelTexture(b.id)} transparent depthWrite={false} />
        </sprite>
      ))}
    </>
  )
}

/** Onde cada foto foi tirada: pino, seta no piso e o "cone" de visão da câmera. */
export function PhotoMarkers({ photos }: { photos: Photo[] }) {
  const show = useView((s) => s.showPhotos && !s.calibration)
  if (!show) return null
  return (
    <>
      {photos.map((p) => (
        <PhotoMarker key={p.id} photo={p} />
      ))}
    </>
  )
}

function frustumGeometry(photo: Photo, length: number) {
  const { position, yaw, pitch, roll, vfov } = photo.pose
  const halfV = Math.tan((vfov * DEG) / 2) * length
  const halfH = halfV * photo.aspect
  const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch * DEG, yaw * DEG, roll * DEG, 'YXZ'))
  const apex = new THREE.Vector3(...position)
  const corners = [
    [-halfH, -halfV],
    [halfH, -halfV],
    [halfH, halfV],
    [-halfH, halfV],
  ].map(([x, y]) => new THREE.Vector3(x, y, -length).applyMatrix4(rot).add(apex))
  const points: THREE.Vector3[] = []
  corners.forEach((c, i) => points.push(apex, c, c, corners[(i + 1) % 4]))
  return new THREE.BufferGeometry().setFromPoints(points)
}

function PhotoMarker({ photo }: { photo: Photo }) {
  const startCalibration = useView((s) => s.startCalibration)
  const [hovered, setHovered] = useState(false)
  const color = photoColor(photo)
  const [x, y, z] = photo.pose.position
  const frustum = useMemo(() => frustumGeometry(photo, 1.3), [photo])
  const label = useMemo(() => labelTexture(`${photo.angle}°`, color), [photo.angle, color])

  const open = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    document.body.style.cursor = ''
    startCalibration(photo)
  }

  return (
    <group>
      <lineSegments geometry={frustum}>
        <lineBasicMaterial color={color} transparent opacity={hovered ? 1 : 0.75} />
      </lineSegments>
      <mesh position={[x, y / 2, z]}>
        <cylinderGeometry args={[0.02, 0.02, y, 8]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <group position={[x, 0.03, z]} rotation-y={photo.pose.yaw * DEG}>
        <mesh
          position={[0, 0, -1.1]}
          rotation-x={-Math.PI / 2}
          scale={hovered ? 1.25 : 1}
          onClick={open}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = ''
          }}
        >
          <coneGeometry args={[0.32, 0.7, 3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
        </mesh>
        <sprite position={[0, 0.55, -1.75]} scale={[0.9, 0.45, 1]} onClick={open}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </group>
      {hovered && (
        <Html position={[x, y + 0.6, z]} center style={{ pointerEvents: 'none' }}>
          <div className="seat-tooltip">
            <strong>
              {photo.label} · {photo.direction}
            </strong>
            <span>clique para comparar com o 3D</span>
          </div>
        </Html>
      )}
    </group>
  )
}
