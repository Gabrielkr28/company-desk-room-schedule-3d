import type { FloorModel, FloorSummary, Photo, Pose } from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly problems: string[] = [],
  ) {
    super(message)
  }
}

async function failure(res: Response): Promise<ApiError> {
  try {
    const body = await res.json()
    return new ApiError(body.error ?? res.statusText, res.status, body.problems ?? [])
  } catch {
    return new ApiError(`${res.status} ${res.statusText}`, res.status)
  }
}

export async function listFloors(): Promise<FloorSummary[]> {
  const res = await fetch('/api/floors')
  if (!res.ok) throw await failure(res)
  return res.json()
}

export type FloorFetch = { notModified: true } | { notModified: false; model: FloorModel; etag: string | null }

/** Busca o andar; com etag faz um GET condicional (304 = nada mudou). */
export async function fetchFloor(id: string, etag?: string | null): Promise<FloorFetch> {
  const res = await fetch(`/api/floors/${encodeURIComponent(id)}`, {
    headers: etag ? { 'If-None-Match': etag } : undefined,
  })
  if (res.status === 304) return { notModified: true }
  if (!res.ok) throw await failure(res)
  return { notModified: false, model: await res.json(), etag: res.headers.get('ETag') }
}

export async function savePhotoPose(floorId: string, photoId: string, pose: Pose): Promise<Photo> {
  const res = await fetch(`/api/floors/${encodeURIComponent(floorId)}/photos/${encodeURIComponent(photoId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pose),
  })
  if (!res.ok) throw await failure(res)
  return res.json()
}
