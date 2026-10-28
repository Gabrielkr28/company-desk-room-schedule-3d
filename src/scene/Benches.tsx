import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Bench, Confidence, Seat } from '../types'
import { useView } from '../store'
import { compose, DEG } from './math'
import { chairGeometry, laptopGeometry, monitorGeometry, peripheralsGeometry, unitBox } from './geometries'
import { dividerTexture, hashString, pedestalTexture, rng } from './textures'

const DESK_TOP = 0.75
const DESK_THICK = 0.03

const TINT: Record<Confidence, THREE.Color> = {
  alta: new THREE.Color('#b4e5c0'),
  media: new THREE.Color('#f6e3a0'),
  baixa: new THREE.Color('#f4b7ae'),
}
const WHITE = new THREE.Color('#f4f4f1')
const HOVER = new THREE.Color('#cde0ff')
const SELECTED = new THREE.Color('#6ea8ff')
const HIDDEN = new THREE.Matrix4().makeTranslation(0, -1000, 0)

interface Layout {
  desks: THREE.Matrix4[]
  pedestals: THREE.Matrix4[]
  peripherals: THREE.Matrix4[]
  chairs: THREE.Matrix4[]
  monitors: THREE.Matrix4[]
  laptops: THREE.Matrix4[]
  dividers: THREE.Matrix4[]
  legs: THREE.Matrix4[]
  beams: THREE.Matrix4[]
}

/** Calcula a matriz de cada peça de cada lugar/bancada a partir do modelo. */
function buildLayout(benches: Bench[], seats: Seat[]): Layout {
  const out: Layout = { desks: [], pedestals: [], peripherals: [], chairs: [], monitors: [], laptops: [], dividers: [], legs: [], beams: [] }
  const base = new THREE.Matrix4()
  const local = new THREE.Matrix4()
  const place = (target: THREE.Matrix4[], x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) =>
    target.push(new THREE.Matrix4().multiplyMatrices(base, compose(local, x, y, z, yaw, sx, sy, sz)))

  for (const seat of seats) {
    const [w, d] = seat.deskSize
    const yaw = seat.yaw * DEG
    compose(base, seat.deskCenter[0], 0, seat.deskCenter[1], yaw)
    place(out.desks, 0, DESK_TOP - DESK_THICK / 2, 0, 0, w - 0.012, DESK_THICK, d)
    place(out.pedestals, w / 2 - 0.27, 0.3, d / 2 - 0.31)
    place(out.peripherals, -0.05, DESK_TOP, d / 2 - 0.2)

    const backZ = -d / 2 + 0.2
    if (seat.monitors >= 2) {
      const spread = seat.laptop ? 0.38 : 0.32
      place(out.monitors, -spread, DESK_TOP, backZ, 0.2)
      place(out.monitors, spread, DESK_TOP, backZ, -0.2)
      if (seat.laptop) place(out.laptops, 0, DESK_TOP, 0.0)
    } else if (seat.monitors === 1) {
      place(out.monitors, seat.laptop ? 0.16 : 0, DESK_TOP, backZ)
      if (seat.laptop) place(out.laptops, -0.4, DESK_TOP, -0.04, 0.3)
    } else if (seat.laptop) {
      place(out.laptops, 0, DESK_TOP, -0.05)
    }

    // cadeira levemente fora do lugar, de forma determinística, para parecer usada
    const r = rng(hashString(seat.id))
    const jitter = (r() - 0.5) * 0.5
    const pushBack = r() * 0.15
    const fx = -Math.sin(yaw)
    const fz = -Math.cos(yaw)
    out.chairs.push(
      compose(new THREE.Matrix4(), seat.position[0] - fx * pushBack + (r() - 0.5) * 0.1, 0, seat.position[1] - fz * pushBack, yaw + jitter),
    )
  }

  for (const bench of benches) {
    const yaw = bench.rotation * DEG
    compose(base, bench.center[0], 0, bench.center[1], yaw)
    const depth = bench.sideDepth * 2
    place(out.dividers, 0, DESK_TOP + 0.18, 0, 0, bench.length - 0.02, 0.36, 0.03)
    place(out.beams, 0, 0.62, 0, 0, bench.length - 0.12, 0.07, 0.12)
    for (const end of [-1, 1]) place(out.legs, end * (bench.length / 2 - 0.03), (DESK_TOP - DESK_THICK) / 2, 0, 0, 0.04, DESK_TOP - DESK_THICK, depth - 0.1)
  }
  return out
}

function useMatrices(ref: RefObject<THREE.InstancedMesh | null>, matrices: THREE.Matrix4[]) {
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.count = matrices.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.computeBoundingBox()
  }, [ref, matrices])
}

function Instances({
  geometry,
  material,
  matrices,
  shadows = true,
  ...events
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material | THREE.Material[]
  matrices: THREE.Matrix4[]
  shadows?: boolean
} & Partial<SeatEvents>) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useMatrices(ref, matrices)
  if (matrices.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} castShadow={shadows} receiveShadow {...events} />
}

export function Benches({ benches, seats }: { benches: Bench[]; seats: Seat[] }) {
  const layout = useMemo(() => buildLayout(benches, seats), [benches, seats])
  const hoverSeat = useView((s) => s.hoverSeat)
  const selectSeat = useView((s) => s.selectSeat)
  const camera = useView((s) => s.camera)
  const photoCamera = useView((s) => s.calibration?.pose.position)

  // na calibração some a cadeira onde o fotógrafo estava (ela não aparece na foto)
  const chairs = useMemo(() => {
    if (!photoCamera) return layout.chairs
    return layout.chairs.map((m, i) => {
      const [x, z] = seats[i].position
      return Math.hypot(x - photoCamera[0], z - photoCamera[2]) < 0.9 ? HIDDEN : m
    })
  }, [layout.chairs, seats, photoCamera])

  const assets = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#ecece9', roughness: 0.5 })
    const front = new THREE.MeshStandardMaterial({ map: pedestalTexture(), roughness: 0.5 })
    return {
      pedestal: [side, side, side, side, front, side],
      vertex: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1 }),
      fabric: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
      divider: new THREE.MeshStandardMaterial({ map: dividerTexture(), roughness: 0.45 }),
      leg: new THREE.MeshStandardMaterial({ color: '#e7e8e8', roughness: 0.45, metalness: 0.1 }),
      beam: new THREE.MeshStandardMaterial({ color: '#a3a8ad', roughness: 0.5, metalness: 0.4 }),
      pedestalGeo: new THREE.BoxGeometry(0.42, 0.58, 0.55),
      chairGeo: chairGeometry(),
      monitorGeo: monitorGeometry(),
      laptopGeo: laptopGeometry(),
      peripheralsGeo: peripheralsGeometry(),
    }
  }, [])

  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    [],
  )

  const seatAt = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.instanceId === undefined ? undefined : seats[e.instanceId])
  const events = {
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      const seat = seatAt(e)
      if (seat && useView.getState().hoveredSeat !== seat.id) hoverSeat(seat.id)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      hoverSeat(null)
      document.body.style.cursor = ''
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const seat = seatAt(e)
      if (seat) selectSeat(seat.id)
    },
    onDoubleClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const seat = seatAt(e)
      if (seat) camera({ kind: 'focus', x: seat.position[0], z: seat.position[1] })
    },
  }

  return (
    <group>
      <DeskTops matrices={layout.desks} seats={seats} events={events} />
      <Instances geometry={assets.chairGeo} material={assets.fabric} matrices={chairs} {...events} />
      <Instances geometry={assets.pedestalGeo} material={assets.pedestal} matrices={layout.pedestals} />
      <Instances geometry={assets.monitorGeo} material={assets.vertex} matrices={layout.monitors} />
      <Instances geometry={assets.laptopGeo} material={assets.vertex} matrices={layout.laptops} />
      <Instances geometry={assets.peripheralsGeo} material={assets.vertex} matrices={layout.peripherals} shadows={false} />
      <Instances geometry={unitBox} material={assets.divider} matrices={layout.dividers} />
      <Instances geometry={unitBox} material={assets.leg} matrices={layout.legs} />
      <Instances geometry={unitBox} material={assets.beam} matrices={layout.beams} shadows={false} />
      <SeatTooltip seats={seats} />
      <SelectionRing seats={seats} />
      <NotePins seats={seats} />
    </group>
  )
}

type SeatEvents = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut: () => void
  onClick: (e: ThreeEvent<MouseEvent>) => void
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void
}

/** Tampos: um por lugar, coloridos por hover/seleção/confiança. */
function DeskTops({ matrices, seats, events }: { matrices: THREE.Matrix4[]; seats: Seat[]; events: SeatEvents }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }), [])
  const hovered = useView((s) => s.hoveredSeat)
  const selected = useView((s) => s.selectedSeat)
  const colorMode = useView((s) => s.colorMode)
  useMatrices(ref, matrices)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    seats.forEach((seat, i) => {
      let color = colorMode === 'confidence' ? TINT[seat.confidence] : WHITE
      if (seat.id === hovered) color = HOVER
      if (seat.id === selected) color = SELECTED
      mesh.setColorAt(i, color)
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [seats, hovered, selected, colorMode, matrices])

  if (matrices.length === 0) return null
  return <instancedMesh ref={ref} args={[unitBox, material, matrices.length]} castShadow receiveShadow {...events} />
}

function SeatTooltip({ seats }: { seats: Seat[] }) {
  const hovered = useView((s) => s.hoveredSeat)
  const calibrating = useView((s) => s.calibration !== null)
  const seat = hovered ? seats.find((s) => s.id === hovered) : undefined
  if (!seat || calibrating) return null
  return (
    <Html position={[seat.position[0], 1.55, seat.position[1]]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="seat-tooltip">
        <strong>{seat.id}</strong>
        <span>
          {seat.monitors} monitor{seat.monitors === 1 ? '' : 'es'}
          {seat.laptop ? ' + notebook' : ''}
        </span>
      </div>
    </Html>
  )
}

function SelectionRing({ seats }: { seats: Seat[] }) {
  const selected = useView((s) => s.selectedSeat)
  const ref = useRef<THREE.Mesh>(null)
  const seat = selected ? seats.find((s) => s.id === selected) : undefined
  useFrame(({ clock }) => {
    if (!ref.current) return
    const k = 1 + Math.sin(clock.elapsedTime * 4) * 0.08
    ref.current.scale.set(k, k, k)
  })
  if (!seat) return null
  return (
    <mesh ref={ref} position={[seat.position[0], 0.012, seat.position[1]]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.42, 0.52, 40]} />
      <meshBasicMaterial color="#2563eb" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}

/** Pino flutuante nos lugares com anotação (ex.: a sua mesa). */
function NotePins({ seats }: { seats: Seat[] }) {
  const noted = useMemo(() => seats.filter((s) => s.note), [seats])
  const group = useRef<THREE.Group>(null)
  const selectSeat = useView((s) => s.selectSeat)
  const calibrating = useView((s) => s.calibration !== null)
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.08
  })
  if (calibrating) return null
  return (
    <group ref={group}>
      {noted.map((seat) => (
        <group
          key={seat.id}
          position={[seat.position[0], 2.0, seat.position[1]]}
          onClick={(e) => {
            e.stopPropagation()
            selectSeat(seat.id)
          }}
        >
          <mesh position-y={0.32}>
            <sphereGeometry args={[0.2, 20, 16]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.35} />
          </mesh>
          <mesh rotation-x={Math.PI}>
            <coneGeometry args={[0.12, 0.38, 16]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
