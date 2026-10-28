import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Column } from '../types'
import { useView } from '../store'
import { damp } from './math'
import { unitBox } from './geometries'
import { artColumnTexture, graniteTexture, hashString, zoneColumnTexture } from './textures'
import { CUT_HEIGHT } from './Walls'

const cap = new THREE.MeshStandardMaterial({ color: '#3c4247', roughness: 0.9 })

function columnMaterials(column: Column): THREE.Material[] {
  let side: THREE.Material
  switch (column.style) {
    case 'art':
      side = new THREE.MeshStandardMaterial({ map: artColumnTexture(hashString(column.id)), roughness: 0.75 })
      break
    case 'zone':
      side = new THREE.MeshStandardMaterial({ map: zoneColumnTexture(column.label ?? '?'), roughness: 0.6 })
      break
    case 'granite': {
      const tex = graniteTexture().clone()
      tex.repeat.set(0.5, 1.8)
      tex.needsUpdate = true
      side = new THREE.MeshStandardMaterial({ map: tex, color: '#a3a6a9', roughness: 0.3 })
      break
    }
    default:
      side = new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.7 })
  }
  return [side, side, cap, cap, side, side]
}

export function Columns({ columns }: { columns: Column[] }) {
  const low = useView((s) => !s.calibration && s.wallMode === 'down')
  return (
    <>
      {columns.map((c) => (
        <ColumnMesh key={c.id} column={c} low={low} />
      ))}
    </>
  )
}

function ColumnMesh({ column, low }: { column: Column; low: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const materials = useMemo(() => columnMaterials(column), [column])
  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const target = low ? CUT_HEIGHT + 0.4 : column.height
    if (mesh.scale.y === target) return
    const h = Math.abs(mesh.scale.y - target) < 0.002 ? target : damp(mesh.scale.y, target, 9, Math.min(dt, 0.1))
    mesh.scale.y = h
    mesh.position.y = h / 2
  })
  return (
    <mesh
      ref={ref}
      geometry={unitBox}
      material={materials}
      position={[column.position[0], column.height / 2, column.position[1]]}
      scale={[column.size[0], column.height, column.size[1]]}
      castShadow
      receiveShadow
    />
  )
}
