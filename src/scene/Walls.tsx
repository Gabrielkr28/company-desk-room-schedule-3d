import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Item, Opening, Wall } from '../types'
import { useView } from '../store'
import { damp } from './math'
import { unitBox } from './geometries'
import { ItemMesh } from './Items'
import { exitSignTexture, graniteTexture, panelTexture } from './textures'

/** Altura das paredes "recortadas", como no The Sims. */
export const CUT_HEIGHT = 0.55

interface Piece {
  from: number
  to: number
  base: number // 0 = trecho cheio; > 0 = verga acima de um vão
}

function wallPieces(wall: Wall): Piece[] {
  const pieces: Piece[] = []
  let cursor = 0
  for (const op of [...wall.openings].sort((a, b) => a.along - b.along)) {
    const a = op.along - op.width / 2
    const b = op.along + op.width / 2
    if (a > cursor + 0.001) pieces.push({ from: cursor, to: a, base: 0 })
    pieces.push({ from: a, to: b, base: op.height })
    cursor = Math.max(cursor, b)
  }
  if (cursor < wall.length - 0.001) pieces.push({ from: cursor, to: wall.length, base: 0 })
  return pieces
}

export function Walls({ walls, items }: { walls: Wall[]; items: Item[] }) {
  const byWall = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of items) if (item.wallId) map.set(item.wallId, [...(map.get(item.wallId) ?? []), item])
    return map
  }, [items])
  return (
    <>
      {walls.map((wall) => (
        <WallView key={wall.id} wall={wall} items={byWall.get(wall.id) ?? []} />
      ))}
    </>
  )
}

function WallView({ wall, items }: { wall: Wall; items: Item[] }) {
  const mode = useView((s) => (s.calibration ? 'up' : s.wallMode))
  const pieces = useMemo(() => wallPieces(wall), [wall])
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const height = useRef(wall.height)
  const progress = useRef(1)
  const applied = useRef(false)

  const dx = (wall.end[0] - wall.start[0]) / wall.length
  const dz = (wall.end[1] - wall.start[1]) / wall.length
  const yaw = Math.atan2(-dz, dx)
  // +z local da parede = (-dz, dx); s indica se o interior fica em +z (1) ou -z (-1)
  const s = Math.sign(wall.inward[0] * -dz + wall.inward[1] * dx) || 1
  const midX = (wall.start[0] + wall.end[0]) / 2
  const midZ = (wall.start[1] + wall.end[1]) / 2

  const materials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: wall.color, roughness: 0.92 })
    const top = new THREE.MeshStandardMaterial({ color: '#3c4247', roughness: 0.9 })
    return [side, side, top, side, side, side]
  }, [wall.color])

  useFrame((state, dt) => {
    const cam = state.camera.position
    const outside = (cam.x - midX) * wall.inward[0] + (cam.z - midZ) * wall.inward[1] < 0
    const target = mode === 'up' ? 1 : mode === 'down' ? 0 : outside ? 0 : 1
    if (progress.current === target && applied.current) return
    progress.current = Math.abs(progress.current - target) < 0.002 ? target : damp(progress.current, target, 9, Math.min(dt, 0.1))
    applied.current = true
    const h = CUT_HEIGHT + (wall.height - CUT_HEIGHT) * progress.current
    height.current = h
    pieces.forEach((p, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      const top = p.base === 0 ? h : h - p.base
      mesh.visible = top > 0.005
      mesh.scale.y = Math.max(top, 0.001)
      mesh.position.y = p.base + mesh.scale.y / 2
    })
  })

  return (
    <group>
      <group position={[wall.start[0], 0, wall.start[1]]} rotation-y={yaw}>
        {pieces.map((p, i) => (
          <mesh
            key={i}
            ref={(m) => {
              meshes.current[i] = m
            }}
            geometry={unitBox}
            material={materials}
            position={[(p.from + p.to) / 2, p.base + (wall.height - p.base) / 2, (-s * wall.thickness) / 2]}
            scale={[p.to - p.from, wall.height - p.base, wall.thickness]}
            castShadow
            receiveShadow
          />
        ))}
        {wall.openings.map((op) => (
          <Door key={op.id} opening={op} side={s} wallHeight={height} />
        ))}
      </group>
      <WallItems items={items} wallHeight={height} />
    </group>
  )
}

/** Itens de parede somem quando a parede é recortada abaixo deles. */
function WallItems({ items, wallHeight }: { items: Item[]; wallHeight: RefObject<number> }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    items.forEach((item, i) => {
      const g = refs.current[i]
      if (g) g.visible = wallHeight.current >= item.position[1] + item.size[1] / 2 - 0.02
    })
  })
  return (
    <>
      {items.map((item, i) => (
        <group
          key={item.id}
          ref={(g) => {
            refs.current[i] = g
          }}
        >
          <ItemMesh item={item} />
        </group>
      ))}
    </>
  )
}

const DOOR_WHITE = '#f1f0ec'

/** Porta / porta dupla / porta de vidro / elevador dentro de um vão (coordenadas locais da parede). */
function Door({ opening, side, wallHeight }: { opening: Opening; side: number; wallHeight: RefObject<number> }) {
  const leaves = useRef<THREE.Group>(null)
  const trim = useRef<THREE.Group>(null)
  const { along, width, height, kind } = opening

  const look = useMemo(() => {
    switch (kind) {
      case 'double-door':
        return { leaf: new THREE.MeshStandardMaterial({ color: '#9ba2a8', roughness: 0.45, metalness: 0.5 }), frame: '#8b9298', count: 2, glass: false }
      case 'glass-door':
        return {
          leaf: new THREE.MeshStandardMaterial({ color: '#cfe8ec', roughness: 0.05, transparent: true, opacity: 0.35 }),
          frame: opening.color ?? '#2f8f8a',
          count: 2,
          glass: true,
        }
      case 'elevator':
        return { leaf: new THREE.MeshStandardMaterial({ map: panelTexture('#2c7d86'), roughness: 0.5 }), frame: 'granite', count: 2, glass: false }
      default:
        return { leaf: new THREE.MeshStandardMaterial({ color: opening.color ?? DOOR_WHITE, roughness: 0.55 }), frame: '#f7f7f4', count: 1, glass: false }
    }
  }, [kind, opening.color])

  const frameMaterial = useMemo(() => {
    if (look.frame !== 'granite') return new THREE.MeshStandardMaterial({ color: look.frame, roughness: 0.5 })
    const tex = graniteTexture().clone()
    tex.repeat.set(0.6, 1.2)
    tex.needsUpdate = true
    return new THREE.MeshStandardMaterial({ map: tex, color: '#a7aaad', roughness: 0.3 })
  }, [look.frame])

  useFrame(() => {
    const h = wallHeight.current
    if (leaves.current) leaves.current.scale.y = Math.min(1, h / height)
    if (trim.current) trim.current.visible = h >= height + 0.05
  })

  const frameW = kind === 'elevator' ? 0.28 : 0.06
  const leafW = (width - 0.04) / look.count
  const inset = -side * 0.08
  const face = side * 0.02

  return (
    <group position-x={along}>
      <group ref={leaves}>
        {Array.from({ length: look.count }, (_, i) => (
          <mesh key={i} position={[-width / 2 + 0.02 + leafW * (i + 0.5), (height - 0.02) / 2, inset]} material={look.leaf} castShadow>
            <boxGeometry args={[leafW - 0.01, height - 0.02, 0.045]} />
          </mesh>
        ))}
        {!look.glass && kind !== 'elevator' && (
          <mesh position={[width / 2 - 0.14, 1.05, inset + side * 0.035]}>
            <boxGeometry args={[0.12, 0.02, 0.03]} />
            <meshStandardMaterial color="#2b2b2b" metalness={0.6} roughness={0.3} />
          </mesh>
        )}
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * (width / 2 + frameW / 2), height / 2, face]} material={frameMaterial} castShadow>
            <boxGeometry args={[frameW, height, 0.06]} />
          </mesh>
        ))}
      </group>
      <group ref={trim}>
        <mesh position={[0, height + frameW / 2, face]} material={frameMaterial}>
          <boxGeometry args={[width + frameW * 2, frameW, 0.06]} />
        </mesh>
        {opening.label === 'SAÍDA' && (
          <mesh position={[0, height + 0.35, side * 0.05]} rotation-y={side > 0 ? 0 : Math.PI}>
            <boxGeometry args={[0.42, 0.16, 0.05]} />
            <meshBasicMaterial attach="material" map={exitSignTexture()} />
          </mesh>
        )}
      </group>
    </group>
  )
}
