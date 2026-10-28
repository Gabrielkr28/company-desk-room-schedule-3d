/** Azimute atual da câmera para a bússola (fora do React para não re-renderizar a cada frame). */
export const compass = {
  azimuth: 0,
  listeners: new Set<(azimuth: number) => void>(),
  set(azimuth: number) {
    if (Math.abs(azimuth - this.azimuth) < 1e-4) return
    this.azimuth = azimuth
    this.listeners.forEach((fn) => fn(azimuth))
  },
}
