import * as THREE from 'three'

export const DEG = Math.PI / 180

const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _p = new THREE.Vector3()
const _s = new THREE.Vector3()

/** Matriz de um objeto em (x, y, z) girado yaw (rad) em torno de Y e escalado. */
export function compose(out: THREE.Matrix4, x: number, y: number, z: number, yaw = 0, sx = 1, sy = 1, sz = 1) {
  _q.setFromEuler(_e.set(0, yaw, 0))
  return out.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz))
}

/** Converte um ponto local (lx, lz) de um referencial (origem + yaw) para o mundo. */
export function localToWorld(ox: number, oz: number, yaw: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return [ox + lx * c + lz * s, oz - lx * s + lz * c]
}

/** Amortecimento exponencial independente de FPS. */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt))
}
