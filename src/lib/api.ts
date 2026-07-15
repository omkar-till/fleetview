export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers, ...rest } = options
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...rest,
    // Merged last so callers can add headers (e.g. device Authorization)
    // without clobbering the JSON Content-Type.
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, body.error || 'Request failed')
  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/** Device app requests carry the enrollment token instead of a cookie. */
export const deviceApi = {
  token: () => localStorage.getItem('fv_device_token'),
  setToken: (token: string) => localStorage.setItem('fv_device_token', token),
  clearToken: () => localStorage.removeItem('fv_device_token'),
  request<T>(path: string, options: RequestInit = {}): Promise<T> {
    return request<T>(path, {
      ...options,
      headers: { Authorization: `Bearer ${deviceApi.token()}`, ...(options.headers || {}) },
    })
  },
  get<T>(path: string) {
    return deviceApi.request<T>(path)
  },
  post<T>(path: string, data?: unknown) {
    return deviceApi.request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
  },
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  device_count?: number
}

export interface Device {
  id: string
  name: string
  type: string
  status: 'pending' | 'active'
  enroll_code: string | null
  battery: number | null
  last_seen_at: string | null
  enrolled_at: string | null
  created_at: string
  assigned_user_id: string | null
  assigned_user_name: string | null
  lat: number | null
  lng: number | null
  location_at: string | null
}

export interface LocationPoint {
  lat: number
  lng: number
  accuracy: number | null
  created_at: string
}

export interface DeviceEvent {
  type: string
  detail: string | null
  created_at: string
  user_name: string | null
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** A device is "online" if it checked in within the last 5 minutes. */
export function isOnline(lastSeen: string | null): boolean {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}
