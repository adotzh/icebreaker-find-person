import type { AttemptPayload, Guest, WinnerPayload } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const API_ROOT = import.meta.env.DEV ? '/api' : API_BASE_URL

type GuestsResponse = {
  guests: Guest[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_ROOT) {
    throw new Error('API URL is missing. Set VITE_API_BASE_URL in your env.')
  }

  const hasBody = Boolean(init?.body)
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'text/plain;charset=utf-8' } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}).`)
  }

  return (await response.json()) as T
}

export async function fetchGuests(): Promise<Guest[]> {
  const payload = await request<GuestsResponse>('?endpoint=guests', { method: 'GET' })
  return payload.guests.filter((guest) => guest.active)
}

export async function logAttempt(attempt: AttemptPayload): Promise<void> {
  await request<{ ok: boolean }>('?endpoint=attempt', {
    method: 'POST',
    body: JSON.stringify(attempt),
  })
}

export async function logWinner(winner: WinnerPayload): Promise<void> {
  await request<{ ok: boolean }>('?endpoint=winner', {
    method: 'POST',
    body: JSON.stringify(winner),
  })
}
