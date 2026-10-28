import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import type { Pose } from '../types'
import { useView } from '../store'
import { DEG } from './math'
import { compass } from './compass'

const { ACTION } = CameraControlsImpl
const FOV = 35
const ISO_POLAR = 0.9 // ~52° a partir da vertical
const QUARTER = Math.PI / 2
const DIAGONAL = Math.PI / 4


// guarda a vista ao entrar na calibração para voltar ao mesmo ponto depois
let savedView: { position: THREE.Vector3; target: THREE.Vector3 } | null = null

/**
 * Câmera "The Sims": sempre de fora e de cima. Arrastar move pelo plano do piso,
 * botão direito gira, scroll aproxima; o ângulo polar é limitado para não
 * descer ao nível dos olhos.
 */
export function CameraRig({ width, depth }: { width: number; depth: number }) {
  const ref = useRef<CameraControlsImpl>(null)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const command = useView((s) => s.command)
  const cx = width / 2
  const cz = depth / 2

  const overview = (c: CameraControlsImpl, animate: boolean) => c.setLookAt(cx + 30, 52, cz + 44, cx, 0, cz - 2, animate)

  useLayoutEffect(() => {
    camera.fov = FOV
    camera.near = 0.1
    camera.far = 600
    camera.updateProjectionMatrix()
  }, [camera])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    if (savedView) c.setLookAt(...savedView.position.toArray(), ...savedView.target.toArray(), false)
    else overview(c, false)
    return () => {
      savedView = { position: c.getPosition(new THREE.Vector3()), target: c.getTarget(new THREE.Vector3()) }
    }
    // a vista inicial só é definida ao montar; mudanças no layout não mexem na câmera
  }, [])

  useEffect(() => {
    ref.current?.setBoundary(new THREE.Box3(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(width + 3, 0, depth + 3)))
  }, [width, depth])

  useEffect(() => {
    const c = ref.current
    if (!c || !command) return
    const snapped = Math.round((c.azimuthAngle - DIAGONAL) / QUARTER) * QUARTER + DIAGONAL
    switch (command.kind) {
      case 'rotate':
        c.rotateAzimuthTo(snapped + command.dir * QUARTER, true)
        break
      case 'iso':
        c.rotateTo(snapped, ISO_POLAR, true)
        break
      case 'top':
        c.rotateTo(Math.round(c.azimuthAngle / (Math.PI * 2)) * Math.PI * 2, 0, true)
        break
      case 'fit':
        overview(c, true)
        break
      case 'focus':
        c.moveTo(command.x, 0, command.z, true)
        c.dollyTo(14, true)
        break
    }
  }, [command])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.ctrlKey || e.metaKey) return
      const c = ref.current
      if (!c) return
      const step = Math.max(1.5, c.distance * 0.08)
      switch (e.key.toLowerCase()) {
        case 'q':
          useView.getState().camera({ kind: 'rotate', dir: 1 })
          break
        case 'e':
          useView.getState().camera({ kind: 'rotate', dir: -1 })
          break
        case 'arrowleft':
          c.truck(-step, 0, true)
          break
        case 'arrowright':
          c.truck(step, 0, true)
          break
        case 'arrowup':
          c.forward(step, true)
          break
        case 'arrowdown':
          c.forward(-step, true)
          break
        case '+':
        case '=':
          c.dolly(step, true)
          break
        case '-':
          c.dolly(-step, true)
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame(() => {
    if (ref.current) compass.set(ref.current.azimuthAngle)
  })

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={1.15}
      minDistance={5}
      maxDistance={120}
      dollyToCursor
      smoothTime={0.3}
      draggingSmoothTime={0.08}
      mouseButtons={{ left: ACTION.SCREEN_PAN, middle: ACTION.DOLLY, right: ACTION.ROTATE, wheel: ACTION.DOLLY }}
      touches={{ one: ACTION.TOUCH_SCREEN_PAN, two: ACTION.TOUCH_DOLLY_ROTATE, three: ACTION.TOUCH_ROTATE }}
    />
  )
}

/** Câmera fixa na pose de uma foto (modo calibração). */
export function CalibrationCamera({ pose }: { pose: Pose }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  useLayoutEffect(() => {
    camera.position.set(...pose.position)
    camera.rotation.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'YXZ')
    camera.fov = pose.vfov
    camera.near = 0.05
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    compass.set(pose.yaw * DEG)
  }, [camera, pose, size])
  return null
}
