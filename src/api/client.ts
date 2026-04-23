import type {
  DeckCard,
  DeckCycle,
  DeckLocalState,
  Guest,
  GuessPayload,
  GuessResult,
  ProfilePayload,
  SkipPayload,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const API_ROOT = import.meta.env.DEV ? '/api' : API_BASE_URL

type GuestsResponse = {
  guests: Guest[]
}

type DeckResponse = {
  cards: DeckCard[]
}

type ProfileResponse = {
  guest: Guest | null
}

type ProgressResponse = {
  answeredCardIds: string[]
  skippedCardIds: string[]
  currentCycle: DeckCycle
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
  return payload.guests.filter((guest) => guest.active && guest.factConfirmed)
}

export async function getProfile(name: string): Promise<Guest | null> {
  const payload = await request<ProfileResponse>(
    `?endpoint=get_profile&name=${encodeURIComponent(name)}`,
    {
      method: 'GET',
    },
  )
  return payload.guest
}

export async function activateProfile(payload: ProfilePayload): Promise<Guest> {
  const result = await request<{ guest: Guest }>('?endpoint=activate_profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return result.guest
}

export async function getDeck(playerGuestId: string, sessionId: string): Promise<DeckCard[]> {
  const payload = await request<DeckResponse>(
    `?endpoint=get_deck&playerGuestId=${encodeURIComponent(playerGuestId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  )
  return payload.cards
}

export async function refreshDeck(playerGuestId: string, sessionId: string): Promise<DeckCard[]> {
  const payload = await request<DeckResponse>(
    `?endpoint=refresh_deck&playerGuestId=${encodeURIComponent(playerGuestId)}&sessionId=${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  )
  return payload.cards
}

export async function getProgress(playerGuestId: string): Promise<DeckLocalState> {
  const payload = await request<ProgressResponse>(
    `?endpoint=get_progress&playerGuestId=${encodeURIComponent(playerGuestId)}`,
    { method: 'GET' },
  )
  return {
    answeredCardIds: payload.answeredCardIds ?? [],
    skippedCardIds: payload.skippedCardIds ?? [],
    currentCycle: payload.currentCycle ?? 'initial',
  }
}

export async function submitGuess(payload: GuessPayload): Promise<GuessResult> {
  return request<GuessResult>('?endpoint=submit_guess', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function skipCard(payload: SkipPayload): Promise<void> {
  await request<{ ok: boolean }>('?endpoint=skip_card', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function selectCardsForCycle(
  cards: DeckCard[],
  answeredCardIds: string[],
  skippedCardIds: string[],
  cycle: DeckCycle,
): DeckCard[] {
  if (cycle === 'replay-skipped') {
    return cards.filter((card) => skippedCardIds.includes(card.id) && !answeredCardIds.includes(card.id))
  }

  return cards.filter((card) => !answeredCardIds.includes(card.id) && !skippedCardIds.includes(card.id))
}
