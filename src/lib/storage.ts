import type { DeckCycle, DeckLocalState, PlayerSession } from '../types'

const SESSION_KEY = 'icebreaker:player-session'
const DECK_STATE_KEY = 'icebreaker:deck-state'

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function createSessionId(): string {
  if ('crypto' in window && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

export function getPlayerSession(): PlayerSession | null {
  return parseJSON<PlayerSession>(window.localStorage.getItem(SESSION_KEY))
}

export function setPlayerSession(session: PlayerSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearPlayerSession(): void {
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(DECK_STATE_KEY)
}

const DEFAULT_DECK_STATE: DeckLocalState = {
  answeredCardIds: [],
  skippedCardIds: [],
  currentCycle: 'initial',
}

export function getDeckState(): DeckLocalState {
  return parseJSON<DeckLocalState>(window.localStorage.getItem(DECK_STATE_KEY)) ?? DEFAULT_DECK_STATE
}

export function setDeckState(next: DeckLocalState): void {
  window.localStorage.setItem(DECK_STATE_KEY, JSON.stringify(next))
}

export function resetDeckState(): void {
  setDeckState(DEFAULT_DECK_STATE)
}

export function markAnswered(cardId: string): DeckLocalState {
  const state = getDeckState()
  if (!state.answeredCardIds.includes(cardId)) {
    state.answeredCardIds.push(cardId)
  }
  state.skippedCardIds = state.skippedCardIds.filter((id) => id !== cardId)
  setDeckState(state)
  return state
}

export function markSkipped(cardId: string): DeckLocalState {
  const state = getDeckState()
  if (!state.skippedCardIds.includes(cardId) && !state.answeredCardIds.includes(cardId)) {
    state.skippedCardIds.push(cardId)
  }
  setDeckState(state)
  return state
}

export function setDeckCycle(cycle: DeckCycle): DeckLocalState {
  const state = getDeckState()
  state.currentCycle = cycle
  setDeckState(state)
  return state
}
