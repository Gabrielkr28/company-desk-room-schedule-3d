import { useView, type WallMode } from '../store'

const WALL_MODES: { mode: WallMode; label: string; title: string }[] = [
  { mode: 'up', label: 'Altas', title: 'Paredes inteiras' },
  { mode: 'cutaway', label: 'Recortadas', title: 'Abaixa as paredes entre você e o andar (estilo The Sims)' },
  { mode: 'down', label: 'Baixas', title: 'Todas as paredes e pilares baixos' },
]

export function Toolbar() {
  const wallMode = useView((s) => s.wallMode)
  const setWallMode = useView((s) => s.setWallMode)
  const colorMode = useView((s) => s.colorMode)
  const setColorMode = useView((s) => s.setColorMode)
  const showLabels = useView((s) => s.showLabels)
  const toggleLabels = useView((s) => s.toggleLabels)
  const showPhotos = useView((s) => s.showPhotos)
  const togglePhotos = useView((s) => s.togglePhotos)
  const camera = useView((s) => s.camera)

  return (
    <div className="toolbar">
      <div className="tool-group">
        <span className="tool-label">Câmera</span>
        <button className="btn icon" title="Girar 90° (Q)" onClick={() => camera({ kind: 'rotate', dir: 1 })}>
          ⟲
        </button>
        <button className="btn icon" title="Girar 90° (E)" onClick={() => camera({ kind: 'rotate', dir: -1 })}>
          ⟳
        </button>
        <button className="btn" onClick={() => camera({ kind: 'iso' })}>
          Isométrica
        </button>
        <button className="btn" onClick={() => camera({ kind: 'top' })}>
          Planta
        </button>
        <button className="btn" onClick={() => camera({ kind: 'fit' })}>
          Andar todo
        </button>
      </div>
      <div className="tool-group">
        <span className="tool-label">Paredes</span>
        <div className="segmented">
          {WALL_MODES.map((m) => (
            <button key={m.mode} className={wallMode === m.mode ? 'active' : ''} title={m.title} onClick={() => setWallMode(m.mode)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="tool-group">
        <span className="tool-label">Camadas</span>
        <button className={showLabels ? 'btn toggle on' : 'btn toggle'} onClick={toggleLabels}>
          IDs
        </button>
        <button className={showPhotos ? 'btn toggle on' : 'btn toggle'} onClick={togglePhotos}>
          Fotos
        </button>
        <button
          className={colorMode === 'confidence' ? 'btn toggle on' : 'btn toggle'}
          onClick={() => setColorMode(colorMode === 'confidence' ? 'normal' : 'confidence')}
          title="Pinta as mesas pelo quanto foram confirmadas nas fotos"
        >
          Confiança
        </button>
      </div>
    </div>
  )
}
