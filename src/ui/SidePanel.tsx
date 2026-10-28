import { useMemo } from 'react'
import type { Confidence, FloorModel, Seat } from '../types'
import { useView } from '../store'
import { photoColor } from '../scene/photoColors'

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  alta: 'Alta — visto de perto nas fotos',
  media: 'Média — visto ao fundo',
  baixa: 'Baixa — inferido pela grade',
}

export function SidePanel({ model }: { model: FloorModel }) {
  const selectedId = useView((s) => s.selectedSeat)
  const seat = useMemo(() => model.seats.find((s) => s.id === selectedId), [model.seats, selectedId])
  const mine = useMemo(() => model.seats.find((s) => s.note), [model.seats])

  return (
    <aside className="side-panel">
      {seat ? <SeatDetails seat={seat} /> : <Intro mine={mine} />}
      <PhotosSection model={model} />
      <Legend model={model} />
      {model.warnings.length > 0 && (
        <section className="panel-section">
          <h3>Avisos do layout ({model.warnings.length})</h3>
          <ul className="warnings">
            {model.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="panel-section">
        <h3>Notas</h3>
        <ul className="notes">
          {model.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

function Intro({ mine }: { mine?: Seat }) {
  const selectSeat = useView((s) => s.selectSeat)
  const camera = useView((s) => s.camera)
  return (
    <section className="panel-section">
      <h2>Mapa do andar</h2>
      <p className="muted">
        Modelo montado a partir das 4 fotos. Passe o mouse numa mesa para ver o ID e clique para os detalhes — esses IDs serão a base do mapeamento e das
        reservas.
      </p>
      {mine && (
        <button
          className="btn primary wide"
          onClick={() => {
            selectSeat(mine.id)
            camera({ kind: 'focus', x: mine.position[0], z: mine.position[1] })
          }}
        >
          Ir para a sua mesa ({mine.id})
        </button>
      )}
    </section>
  )
}

function SeatDetails({ seat }: { seat: Seat }) {
  const selectSeat = useView((s) => s.selectSeat)
  const camera = useView((s) => s.camera)
  return (
    <section className="panel-section seat-details">
      <div className="seat-header">
        <div>
          <span className="eyebrow">Lugar</span>
          <h2>{seat.id}</h2>
        </div>
        <button className="btn ghost small" onClick={() => selectSeat(null)} aria-label="Fechar">
          ✕
        </button>
      </div>
      <dl>
        <dt>Bancada</dt>
        <dd>
          {seat.benchId} · lado {seat.side} · posição {seat.index}
        </dd>
        <dt>Equipamento</dt>
        <dd>
          {seat.monitors} monitor{seat.monitors === 1 ? '' : 'es'}
          {seat.laptop ? ' + notebook' : ''}
        </dd>
        <dt>Coordenadas</dt>
        <dd>
          x {seat.position[0].toFixed(2)} m · z {seat.position[1].toFixed(2)} m
        </dd>
        <dt>Confiança</dt>
        <dd>
          <span className={`badge ${seat.confidence}`}>{CONFIDENCE_LABEL[seat.confidence]}</span>
        </dd>
        {seat.note && (
          <>
            <dt>Nota</dt>
            <dd>{seat.note}</dd>
          </>
        )}
      </dl>
      <div className="future">
        <strong>Ocupação e reservas</strong>
        <span>Quem senta aqui, presencial/home e reservas entram nas fases 3 e 4.</span>
      </div>
      <div className="row">
        <button className="btn" onClick={() => camera({ kind: 'focus', x: seat.position[0], z: seat.position[1] })}>
          Centralizar
        </button>
        <button className="btn" onClick={() => navigator.clipboard?.writeText(seat.id)}>
          Copiar ID
        </button>
      </div>
    </section>
  )
}

function PhotosSection({ model }: { model: FloorModel }) {
  const startCalibration = useView((s) => s.startCalibration)
  const photos = [...model.photos].sort((a, b) => a.angle - b.angle)
  return (
    <section className="panel-section">
      <h3>Fotos de referência</h3>
      <p className="muted small">Compare cada foto com o 3D na mesma posição de câmera para ajustar o modelo.</p>
      <div className="photo-grid">
        {photos.map((p) => (
          <button key={p.id} className="photo-card" onClick={() => startCalibration(p)} disabled={!p.available}>
            {p.available ? <img src={p.url} alt={p.label} loading="lazy" /> : <div className="missing">sem arquivo</div>}
            <span className="photo-angle" style={{ background: photoColor(p) }}>
              {p.angle}°
            </span>
            <span className="photo-dir">{p.direction}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function Legend({ model }: { model: FloorModel }) {
  const colorMode = useView((s) => s.colorMode)
  const setColorMode = useView((s) => s.setColorMode)
  const total = model.stats.seats || 1
  return (
    <section className="panel-section">
      <h3>Confiança do mapeamento</h3>
      <div className="confidence-bar">
        {(['alta', 'media', 'baixa'] as Confidence[]).map((c) => (
          <span key={c} className={c} style={{ flex: model.stats.byConfidence[c] || 0.001 }} />
        ))}
      </div>
      <ul className="legend">
        {(['alta', 'media', 'baixa'] as Confidence[]).map((c) => (
          <li key={c}>
            <span className={`dot ${c}`} />
            {CONFIDENCE_LABEL[c]}
            <strong>{Math.round((model.stats.byConfidence[c] / total) * 100)}%</strong>
          </li>
        ))}
      </ul>
      {colorMode !== 'confidence' && (
        <button className="btn wide" onClick={() => setColorMode('confidence')}>
          Pintar mesas por confiança
        </button>
      )}
    </section>
  )
}
