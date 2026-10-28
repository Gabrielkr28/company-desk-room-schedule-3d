import { useEffect, useState } from 'react'
import { fetchFloor, listFloors } from './api'
import type { FloorModel, FloorSummary } from './types'

interface FloorState {
  floors: FloorSummary[]
  model: FloorModel | null
  error: string | null
  loading: boolean
}

/**
 * Carrega o andar e faz polling condicional (ETag) a cada 3 s: editar o
 * layout.json no backend atualiza a cena sem recarregar a página.
 */
export function useFloorModel(): FloorState & { reload: () => void } {
  const [state, setState] = useState<FloorState>({ floors: [], model: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let etag: string | null = null
    let floorId: string | null = null

    async function tick() {
      try {
        if (!floorId) {
          const floors = await listFloors()
          if (cancelled) return
          if (floors.length === 0) throw new Error('Nenhum andar em backend/data/floors')
          floorId = floors[0].id
          setState((s) => ({ ...s, floors }))
        }
        const res = await fetchFloor(floorId, etag)
        if (cancelled) return
        if (!res.notModified) {
          etag = res.etag
          setState((s) => ({ ...s, model: res.model, error: null, loading: false }))
        } else {
          setState((s) => (s.error ? { ...s, error: null } : s))
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setState((s) => ({ ...s, error: message, loading: false }))
      }
      timer = setTimeout(tick, document.hidden ? 10_000 : 3_000)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [attempt])

  return { ...state, reload: () => setAttempt((a) => a + 1) }
}
