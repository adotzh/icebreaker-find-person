import type { Assignment, PlayerSession } from '../types'

const SESSION_KEY = 'icebreaker:player-session'
const ASSIGNMENT_KEY = 'icebreaker:assignment'
const WINNER_KEY = 'icebreaker:winner-mark'

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
  window.localStorage.removeItem(ASSIGNMENT_KEY)
  window.localStorage.removeItem(WINNER_KEY)
}

export function getAssignment(): Assignment | null {
  return parseJSON<Assignment>(window.localStorage.getItem(ASSIGNMENT_KEY))
}

export function setAssignment(assignment: Assignment): void {
  window.localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignment))
}

export function hasWinnerMark(sessionId: string): boolean {
  const value = window.localStorage.getItem(WINNER_KEY)
  return value === sessionId
}

export function setWinnerMark(sessionId: string): void {
  window.localStorage.setItem(WINNER_KEY, sessionId)
}
