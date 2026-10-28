import { useFloorModel } from './useFloorModel'
import { useView } from './store'
import { FloorScene } from './scene/FloorScene'
import { TopBar } from './ui/TopBar'
import { Toolbar } from './ui/Toolbar'
import { SidePanel } from './ui/SidePanel'
import { CalibrationPanel } from './ui/CalibrationPanel'
import { Compass } from './ui/Compass'

export function App() {
  const { model, error, loading, reload } = useFloorModel()
  const calibration = useView((s) => s.calibration)

  if (!model) {
    return (
      <div className="splash">
        <div className="splash-card">
          <h1>DeskMap</h1>
          {loading ? (
            <p>Carregando o andar…</p>
          ) : (
            <>
              <p className="error">Não foi possível falar com a API: {error}</p>
              <p className="muted">
                Suba o backend com <code>go run ./cmd/api</code> em <code>deskmap/backend</code>.
              </p>
              <button className="btn primary" onClick={reload}>
                Tentar de novo
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar model={model} apiError={error} />
      <main className="workspace">
        <section className={calibration ? 'stage calibrating' : 'stage'}>
          <div className="frame" style={calibration ? { aspectRatio: String(calibration.photo.aspect) } : undefined}>
            <FloorScene model={model} />
            {calibration && (
              <img
                className="photo-overlay"
                src={calibration.photo.url}
                alt={calibration.photo.label}
                style={{ opacity: calibration.opacity, mixBlendMode: calibration.blend }}
              />
            )}
          </div>
          {!calibration && <Toolbar />}
          <Compass />
          {!calibration && (
            <p className="hint">Arraste para mover · botão direito gira · scroll aproxima · Q/E giram 90° · duplo clique centraliza</p>
          )}
        </section>
        {calibration ? <CalibrationPanel key={calibration.photo.id} floorId={model.id} photos={model.photos} /> : <SidePanel model={model} />}
      </main>
    </div>
  )
}
