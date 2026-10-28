import { useState } from 'react'
import type { Photo, Pose } from '../types'
import { useView } from '../store'
import { savePhotoPose } from '../api'
import { photoColor } from '../scene/photoColors'

interface SliderSpec {
  label: string
  min: number
  max: number
  step: number
  unit: string
  get: (p: Pose) => number
  set: (p: Pose, v: number) => Partial<Pose>
}

const withPosition = (p: Pose, i: number, v: number): Partial<Pose> => {
  const position = [...p.position] as Pose['position']
  position[i] = v
  return { position }
}

const SLIDERS: SliderSpec[] = [
  { label: 'Yaw (direção)', min: -180, max: 180, step: 0.5, unit: '°', get: (p) => p.yaw, set: (_, v) => ({ yaw: v }) },
  { label: 'Pitch (inclinação)', min: -80, max: 20, step: 0.5, unit: '°', get: (p) => p.pitch, set: (_, v) => ({ pitch: v }) },
  { label: 'Roll', min: -15, max: 15, step: 0.25, unit: '°', get: (p) => p.roll, set: (_, v) => ({ roll: v }) },
  { label: 'Campo de visão', min: 50, max: 130, step: 0.5, unit: '°', get: (p) => p.vfov, set: (_, v) => ({ vfov: v }) },
  { label: 'Altura da câmera', min: 0.6, max: 2.2, step: 0.01, unit: ' m', get: (p) => p.position[1], set: (p, v) => withPosition(p, 1, v) },
  { label: 'Posição x (leste)', min: -1, max: 1, step: 0.01, unit: ' m', get: (p) => p.position[0], set: (p, v) => withPosition(p, 0, v) },
  { label: 'Posição z (sul)', min: -1, max: 1, step: 0.01, unit: ' m', get: (p) => p.position[2], set: (p, v) => withPosition(p, 2, v) },
]

export function CalibrationPanel({ floorId, photos }: { floorId: string; photos: Photo[] }) {
  const calibration = useView((s) => s.calibration)
  const startCalibration = useView((s) => s.startCalibration)
  const updatePose = useView((s) => s.updatePose)
  const setOverlay = useView((s) => s.setOverlay)
  const markPoseSaved = useView((s) => s.markPoseSaved)
  const stop = useView((s) => s.stopCalibration)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  if (!calibration) return null
  const { photo, pose } = calibration
  const saved = photo.pose
  const dirty = JSON.stringify(saved) !== JSON.stringify(pose)

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const updated = await savePhotoPose(floorId, photo.id, pose)
      markPoseSaved(updated)
      setStatus({ kind: 'ok', text: 'Pose salva em photos.json' })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className="side-panel calibration-panel">
      <section className="panel-section">
        <div className="seat-header">
          <div>
            <span className="eyebrow" style={{ color: photoColor(photo) }}>
              Calibração · {photo.angle}°
            </span>
            <h2>{photo.direction}</h2>
          </div>
          <button className="btn ghost small" onClick={stop}>
            Sair
          </button>
        </div>
        <p className="muted small">
          A câmera está onde a foto foi tirada. Ajuste até as linhas do 3D (bancadas, pilares, portas) casarem com a foto. Se não casarem mesmo com a câmera
          certa, o layout é que precisa mudar.
        </p>
        <div className="segmented photo-switch">
          {[...photos]
            .sort((a, b) => a.angle - b.angle)
            .map((p) => (
              <button
                key={p.id}
                className={p.id === photo.id ? 'active' : ''}
                disabled={!p.available}
                onClick={() => p.id !== photo.id && startCalibration(p)}
                title={p.direction}
              >
                {p.angle}°
              </button>
            ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>Sobreposição da foto</h3>
        <label className="slider">
          <span>
            Opacidade <em>{Math.round(calibration.opacity * 100)}%</em>
          </span>
          <input type="range" min={0} max={1} step={0.01} value={calibration.opacity} onChange={(e) => setOverlay({ opacity: Number(e.target.value) })} />
        </label>
        <div className="segmented">
          <button className={calibration.blend === 'normal' ? 'active' : ''} onClick={() => setOverlay({ blend: 'normal' })}>
            Normal
          </button>
          <button className={calibration.blend === 'difference' ? 'active' : ''} onClick={() => setOverlay({ blend: 'difference', opacity: 1 })}>
            Diferença
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h3>Pose da câmera</h3>
        {SLIDERS.map((s) => {
          const value = s.get(pose)
          const isOffset = s.label.startsWith('Posição')
          const base = isOffset ? s.get(saved) : 0
          return (
            <label key={s.label} className="slider">
              <span>
                {s.label}{' '}
                <em>
                  {value.toFixed(s.step < 0.1 ? 2 : 1)}
                  {s.unit}
                </em>
              </span>
              <input
                type="range"
                min={base + s.min}
                max={base + s.max}
                step={s.step}
                value={value}
                onChange={(e) => updatePose(s.set(pose, Number(e.target.value)))}
              />
            </label>
          )
        })}
      </section>

      <section className="panel-section">
        <div className="row">
          <button className="btn primary" disabled={!dirty || saving} onClick={save}>
            {saving ? 'Salvando…' : 'Salvar pose'}
          </button>
          <button className="btn" disabled={!dirty} onClick={() => updatePose(structuredClone(saved))}>
            Desfazer
          </button>
        </div>
        {status && <p className={status.kind === 'ok' ? 'ok small' : 'error small'}>{status.text}</p>}
      </section>
    </aside>
  )
}
