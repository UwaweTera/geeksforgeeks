const BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function getToken() {
  return localStorage.getItem('geekpath-token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('geekpath-token', token)
  else localStorage.removeItem('geekpath-token')
}

export async function api<T>(path: string, options: Omit<RequestInit, 'body'> & { body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const { body, ...rest } = options
  const response = await fetch(`${BASE}${path}`, {
    ...rest,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(data.message || 'Request failed', response.status)
  }
  return data as T
}
