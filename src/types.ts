// Espelha o JSON de GET /api/floors/{id} (backend/internal/floorplan/model.go).

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]
export type Confidence = 'alta' | 'media' | 'baixa'

export interface FloorSummary {
  id: string
  name: string
  building: string
  seats: number
  error?: string
}

export interface FloorModel {
  id: string
  name: string
  building: string
  version: string
  width: number
  depth: number
  ceilingHeight: number
  walls: Wall[]
  columns: Column[]
  benches: Bench[]
  seats: Seat[]
  items: Item[]
  photos: Photo[]
  stats: Stats
  notes: string[]
  warnings: string[]
  reloadError?: string
}

export interface Wall {
  id: string
  name?: string
  start: Vec2
  end: Vec2
  length: number
  height: number
  thickness: number
  color: string
  inward: Vec2
  confidence: Confidence
  openings: Opening[]
}

export interface Opening {
  id: string
  kind: 'door' | 'double-door' | 'glass-door' | 'elevator' | string
  along: number
  width: number
  height: number
  label?: string
  color?: string
}

export interface Column {
  id: string
  position: Vec2
  size: Vec2
  height: number
  style: 'art' | 'zone' | 'granite' | 'plain'
  label?: string
  confidence: Confidence
}

export interface Bench {
  id: string
  row?: string
  bay?: number
  center: Vec2
  rotation: number
  length: number
  sideDepth: number
  seatWidth: number
  seatsPerSide: number
  sides: string[]
  seatCount: number
  confidence: Confidence
}

export interface Seat {
  id: string
  benchId: string
  side: string
  index: number
  position: Vec2
  deskCenter: Vec2
  deskSize: Vec2
  yaw: number
  monitors: number
  laptop: boolean
  note?: string
  confidence: Confidence
}

export interface Item {
  id: string
  kind: string
  wallId?: string
  position: Vec3
  yaw: number
  size: Vec3
  label?: string
  color?: string
}

export interface Pose {
  position: Vec3
  yaw: number
  pitch: number
  roll: number
  vfov: number
}

export interface Photo {
  id: string
  label: string
  angle: number
  direction: string
  aspect: number
  note?: string
  pose: Pose
  url: string
  available: boolean
}

export interface Stats {
  benches: number
  seats: number
  columns: number
  byConfidence: Record<Confidence, number>
}
