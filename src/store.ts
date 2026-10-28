import { create } from 'zustand'
import type { Photo, Pose } from './types'

export type WallMode = 'up' | 'cutaway' | 'down'
export type ColorMode = 'normal' | 'confidence'
export type Quality = 'high' | 'low'

export type CameraCommand =
  | { kind: 'rotate'; dir: 1 | -1 }
  | { kind: 'iso' }
  | { kind: 'top' }
  | { kind: 'fit' }
  | { kind: 'focus'; x: number; z: number }

export interface Calibration {
  photo: Photo
  pose: Pose // pose em edição (a salva fica em photo.pose)
  opacity: number
  blend: 'normal' | 'difference'
}

interface ViewState {
  wallMode: WallMode
  colorMode: ColorMode
  quality: Quality
  showLabels: boolean
  showPhotos: boolean
  hoveredSeat: string | null
  selectedSeat: string | null
  calibration: Calibration | null
  command: (CameraCommand & { seq: number }) | null

  setWallMode: (mode: WallMode) => void
  setColorMode: (mode: ColorMode) => void
  setQuality: (q: Quality) => void
  toggleLabels: () => void
  togglePhotos: () => void
  hoverSeat: (id: string | null) => void
  selectSeat: (id: string | null) => void
  camera: (cmd: CameraCommand) => void
  startCalibration: (photo: Photo) => void
  updatePose: (patch: Partial<Pose>) => void
  setOverlay: (patch: Partial<Pick<Calibration, 'opacity' | 'blend'>>) => void
  markPoseSaved: (photo: Photo) => void
  stopCalibration: () => void
}

let seq = 0

function initialQuality(): Quality {
  try {
    return localStorage.getItem('deskmap.quality') === 'low' ? 'low' : 'high'
  } catch {
    return 'high'
  }
}

export const useView = create<ViewState>()((set) => ({
  wallMode: 'cutaway',
  colorMode: 'normal',
  quality: initialQuality(),
  showLabels: true,
  showPhotos: true,
  hoveredSeat: null,
  selectedSeat: null,
  calibration: null,
  command: null,

  setWallMode: (wallMode) => set({ wallMode }),
  setColorMode: (colorMode) => set({ colorMode }),
  setQuality: (quality) => {
    try {
      localStorage.setItem('deskmap.quality', quality)
    } catch {
      // armazenamento indisponível: só não lembra a preferência
    }
    set({ quality })
  },
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  togglePhotos: () => set((s) => ({ showPhotos: !s.showPhotos })),
  hoverSeat: (hoveredSeat) => set({ hoveredSeat }),
  selectSeat: (selectedSeat) => set({ selectedSeat }),
  camera: (cmd) => set({ command: { ...cmd, seq: ++seq } }),
  startCalibration: (photo) =>
    set((s) => ({
      calibration: { photo, pose: structuredClone(photo.pose), opacity: s.calibration?.opacity ?? 0.5, blend: s.calibration?.blend ?? 'normal' },
      hoveredSeat: null,
      selectedSeat: null,
    })),
  updatePose: (patch) =>
    set((s) => (s.calibration ? { calibration: { ...s.calibration, pose: { ...s.calibration.pose, ...patch } } } : {})),
  setOverlay: (patch) => set((s) => (s.calibration ? { calibration: { ...s.calibration, ...patch } } : {})),
  markPoseSaved: (photo) =>
    set((s) => (s.calibration?.photo.id === photo.id ? { calibration: { ...s.calibration, photo } } : {})),
  stopCalibration: () => set({ calibration: null }),
}))
