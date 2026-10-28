import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

// Geometrias "mescladas" com cor por vértice: cada móvel vira uma única
// geometria e é desenhado com InstancedMesh (um draw call para centenas de cópias).

interface PartOptions {
  at?: [number, number, number]
  rot?: [number, number, number]
}

function part(geometry: THREE.BufferGeometry, color: string, { at = [0, 0, 0], rot = [0, 0, 0] }: PartOptions = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  g.applyMatrix4(
    new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(1, 1, 1),
    ),
  )
  const c = new THREE.Color(color)
  const colors = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = c.r
    colors[i + 1] = c.g
    colors[i + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false)
  if (!merged) throw new Error('falha ao mesclar geometrias')
  merged.computeBoundingSphere()
  return merged
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 2, r)

/** Cadeira de escritório preta. Origem no piso, frente para -z (para a mesa). */
export function chairGeometry(): THREE.BufferGeometry {
  const fabric = '#222428'
  const plastic = '#1a1b1d'
  const metal = '#6d7176'
  const parts = [
    part(rbox(0.5, 0.08, 0.48, 0.03), fabric, { at: [0, 0.47, 0] }),
    part(rbox(0.46, 0.56, 0.07, 0.03), fabric, { at: [0, 0.83, 0.24], rot: [0.12, 0, 0] }),
    part(box(0.07, 0.32, 0.04), plastic, { at: [0, 0.6, 0.25] }),
    part(box(0.035, 0.2, 0.035), plastic, { at: [-0.265, 0.58, 0.03] }),
    part(box(0.035, 0.2, 0.035), plastic, { at: [0.265, 0.58, 0.03] }),
    part(box(0.07, 0.03, 0.24), plastic, { at: [-0.265, 0.69, 0.01] }),
    part(box(0.07, 0.03, 0.24), plastic, { at: [0.265, 0.69, 0.01] }),
    part(new THREE.CylinderGeometry(0.026, 0.03, 0.32, 10), metal, { at: [0, 0.28, 0] }),
  ]
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2
    parts.push(part(box(0.32, 0.035, 0.05), plastic, { at: [Math.cos(a) * 0.16, 0.085, -Math.sin(a) * 0.16], rot: [0, a, 0] }))
    parts.push(part(new THREE.SphereGeometry(0.032, 8, 6), plastic, { at: [Math.cos(a) * 0.31, 0.034, -Math.sin(a) * 0.31] }))
  }
  return merge(parts)
}

/** Monitor com pé. Origem no tampo da mesa, tela virada para +z (para a pessoa). */
export function monitorGeometry(): THREE.BufferGeometry {
  const body = '#151618'
  return merge([
    part(box(0.24, 0.015, 0.19), body, { at: [0, 0.0075, 0] }),
    part(box(0.05, 0.25, 0.03), body, { at: [0, 0.13, -0.05] }),
    part(box(0.62, 0.37, 0.03), body, { at: [0, 0.34, -0.025] }),
    part(box(0.595, 0.345, 0.004), '#34495f', { at: [0, 0.345, -0.008] }),
  ])
}

/** Notebook aberto. Origem no tampo, tela virada para +z. */
export function laptopGeometry(): THREE.BufferGeometry {
  const shell = '#2b2d31'
  return merge([
    part(box(0.33, 0.018, 0.23), shell, { at: [0, 0.009, 0] }),
    part(box(0.29, 0.003, 0.1), '#18191b', { at: [0, 0.019, 0.02] }),
    part(box(0.33, 0.22, 0.008), shell, { at: [0, 0.115, -0.13], rot: [-0.28, 0, 0] }),
    part(box(0.3, 0.19, 0.002), '#3b5371', { at: [0, 0.117, -0.124], rot: [-0.28, 0, 0] }),
  ])
}

/** Teclado + mouse + mouse pad redondo. Origem no centro do teclado. */
export function peripheralsGeometry(): THREE.BufferGeometry {
  return merge([
    part(box(0.44, 0.02, 0.14), '#1c1d20', { at: [0, 0.01, 0] }),
    part(new THREE.CylinderGeometry(0.11, 0.11, 0.003, 20), '#202124', { at: [0.34, 0.0015, 0.02] }),
    part(rbox(0.06, 0.03, 0.1, 0.012), '#2a2b2e', { at: [0.34, 0.018, 0.02] }),
  ])
}

export const unitBox = new THREE.BoxGeometry(1, 1, 1)
