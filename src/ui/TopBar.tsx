import type { FloorModel } from '../types'
import { useView } from '../store'

export function TopBar({ model, apiError }: { model: FloorModel; apiError: string | null }) {
  const quality = useView((s) => s.quality)
  const setQuality = useView((s) => s.setQuality)
  return (
    <header className="topbar">
      <div className="brand">
        <img src="/favicon.svg" alt="" width={28} height={28} />
        <div>
          <strong>DeskMap</strong>
          <span>
            {model.name} · {model.building}
          </span>
        </div>
      </div>
      <div className="stats">
        <Stat value={model.stats.benches} label="bancadas" />
        <Stat value={model.stats.seats} label="lugares" />
        <Stat value={model.stats.columns} label="pilares" />
        <Stat value={`${model.width} × ${model.depth} m`} label="andar" />
      </div>
      <div className="topbar-actions">
        <span className="phase">Fase 1 · modelo 3D</span>
        <span className={apiError ? 'status offline' : 'status online'} title={apiError ?? 'API conectada (hot reload ativo)'}>
          {apiError ? 'API offline' : 'API online'}
        </span>
        <button className="btn ghost small" onClick={() => setQuality(quality === 'high' ? 'low' : 'high')} title="Sombras suaves e oclusão de ambiente">
          Qualidade: {quality === 'high' ? 'alta' : 'leve'}
        </button>
      </div>
      {model.reloadError && (
        <div className="reload-error">
          <strong>layout.json com erro</strong> — mostrando a última versão válida. {model.reloadError}
        </div>
      )}
    </header>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
