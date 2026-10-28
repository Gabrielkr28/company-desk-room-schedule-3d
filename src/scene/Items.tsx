import { useMemo } from 'react'
import * as THREE from 'three'
import type { Item } from '../types'
import { DEG } from './math'
import {
  exitSignTexture,
  hashString,
  kanbanTexture,
  muralTexture,
  panelTexture,
  ventTexture,
  whiteboardTexture,
} from './textures'

const plain = (color: string, roughness = 0.6, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })

/** Caixa cuja face +z (frente) recebe uma textura e as demais uma cor. */
function FacedBox({ size, front, sides }: { size: THREE.Vector3Tuple; front: THREE.Material; sides: THREE.Material }) {
  const materials = useMemo(() => [sides, sides, sides, sides, front, sides], [front, sides])
  return (
    <mesh material={materials} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}

/**
 * Renderiza um item do modelo. A API dá o centro e o yaw da frente; aqui o
 * grupo interno gira 180° para que "frente" seja +z local.
 */
export function ItemMesh({ item }: { item: Item }) {
  const [w, h, d] = item.size
  const seed = hashString(item.id)
  const content = useMemo(() => {
    switch (item.kind) {
      case 'whiteboard':
        return (
          <>
            <FacedBox size={[w, h, d]} front={new THREE.MeshStandardMaterial({ map: whiteboardTexture(seed), roughness: 0.25 })} sides={plain('#c5cacd', 0.4, 0.5)} />
            <mesh position={[0, -h / 2 - 0.015, d / 2 + 0.03]} castShadow>
              <boxGeometry args={[w * 0.85, 0.025, 0.06]} />
              <meshStandardMaterial color="#c5cacd" metalness={0.5} roughness={0.4} />
            </mesh>
          </>
        )
      case 'kanban':
        return <FacedBox size={[w, h, d]} front={new THREE.MeshStandardMaterial({ map: kanbanTexture(seed), roughness: 0.9 })} sides={plain('#2a2c2e')} />
      case 'panel':
        return <FacedBox size={[w, h, d]} front={new THREE.MeshStandardMaterial({ map: panelTexture(item.color ?? '#2c7d86'), roughness: 0.6 })} sides={plain(item.color ?? '#2c7d86')} />
      case 'mural':
        return (
          <mesh position-z={d / 2 + 0.002}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial map={muralTexture(seed)} roughness={0.8} />
          </mesh>
        )
      case 'extinguisher':
        return (
          <>
            <mesh position-y={-h * 0.08} castShadow>
              <cylinderGeometry args={[w * 0.42, w * 0.42, h * 0.82, 18]} />
              <meshStandardMaterial color="#c81e1e" roughness={0.35} metalness={0.2} />
            </mesh>
            <mesh position-y={h * 0.4}>
              <cylinderGeometry args={[w * 0.15, w * 0.2, h * 0.16, 10]} />
              <meshStandardMaterial color="#1f1f1f" />
            </mesh>
            <mesh position={[0, h / 2 + 0.3, -d / 2 + 0.006]}>
              <planeGeometry args={[0.22, 0.26]} />
              <meshStandardMaterial color="#d32f2f" />
            </mesh>
            <mesh position={[0, h / 2 + 0.62, -d / 2 + 0.006]}>
              <planeGeometry args={[0.16, 0.24]} />
              <meshStandardMaterial color="#f59e0b" />
            </mesh>
          </>
        )
      case 'hose-cabinet':
        return (
          <>
            <mesh castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#c62828" roughness={0.4} />
            </mesh>
            <mesh position={[0, h * 0.08, d / 2 + 0.002]}>
              <circleGeometry args={[w * 0.22, 24]} />
              <meshStandardMaterial color="#8a1c1c" roughness={0.3} />
            </mesh>
          </>
        )
      case 'time-clock':
        return (
          <>
            <mesh castShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial color="#1b1c1e" />
            </mesh>
            <mesh position={[0, h * 0.18, d / 2 + 0.002]}>
              <planeGeometry args={[w * 0.6, h * 0.25]} />
              <meshStandardMaterial color="#4b6a8a" emissive="#1e3a5f" />
            </mesh>
          </>
        )
      case 'sign':
        return <FacedBox size={[w, h, d]} front={new THREE.MeshBasicMaterial({ map: exitSignTexture() })} sides={plain('#e5e5e5')} />
      case 'floor-vent':
        return (
          <mesh rotation-x={-Math.PI / 2} position-y={-h / 2 + 0.003} receiveShadow>
            <circleGeometry args={[w / 2, 32]} />
            <meshStandardMaterial map={ventTexture()} roughness={0.7} metalness={0.3} />
          </mesh>
        )
      default:
        return (
          <mesh castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={item.color ?? '#9ca3af'} />
          </mesh>
        )
    }
  }, [item, w, h, d, seed])

  return (
    <group position={item.position} rotation-y={item.yaw * DEG + Math.PI}>
      {content}
    </group>
  )
}

export function FloorItems({ items }: { items: Item[] }) {
  const free = useMemo(() => items.filter((i) => !i.wallId), [items])
  return (
    <>
      {free.map((item) => (
        <ItemMesh key={item.id} item={item} />
      ))}
    </>
  )
}
