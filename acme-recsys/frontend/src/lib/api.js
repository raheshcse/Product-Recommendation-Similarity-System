/**
 * Single place where the frontend talks to FastAPI.
 * Every component imports from here - no fetch calls scattered through the UI.
 */

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new ApiError(formatDetail(payload) ?? `Request failed (${response.status})`, response.status)
  }
  return payload
}

function formatDetail(payload) {
  const detail = payload?.detail
  if (!detail) return null
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg ?? JSON.stringify(d)).join('; ')
  return JSON.stringify(detail)
}

export const api = {
  health: (signal) => request('/health', { signal }),
  models: (signal) => request('/models', { signal }),
  stats: (signal) => request('/catalogue/stats', { signal }),
  categories: (signal) => request('/catalogue/categories', { signal }),
  sample: (n = 8, signal) => request(`/catalogue/sample?n=${n}`, { signal }),
  search: (q, signal) => request(`/catalogue/search?q=${encodeURIComponent(q)}&limit=20`, { signal }),
  recommend: (payload, signal) => request('/recommend', { method: 'POST', body: payload, signal }),
  explain: (payload, signal) => request('/explain', { method: 'POST', body: payload, signal }),
  neighbours: (word, signal) => request(`/neighbours?word=${encodeURIComponent(word)}`, { signal }),
  evaluation: (sampleSize, k, signal) =>
    request(`/evaluation?sample_size=${sampleSize}&k=${k}`, { signal }),
}

export { ApiError }
