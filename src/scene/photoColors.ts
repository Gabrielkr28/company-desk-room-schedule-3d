import type { Photo } from '../types'

const PHOTO_COLORS: Record<number, string> = { 90: '#16a34a', 180: '#ea580c', 270: '#9333ea', 360: '#2563eb' }

export function photoColor(photo: Photo) {
  return PHOTO_COLORS[photo.angle] ?? '#0ea5e9'
}
