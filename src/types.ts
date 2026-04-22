export type Guest = {
  id: string
  name: string
  fact: string
  active: boolean
  factConfirmed: boolean
  activatedAt?: string
  factUpdatedAt?: string
}

export type DeckCard = {
  id: string
  fact: string
}

export type GuessPayload = {
  sessionId: string
  playerGuestId: string
  targetGuestId: string
  answerName: string
  cycle: DeckCycle
}

export type GuessResult = {
  ok: boolean
  result: 'correct' | 'incorrect'
}

export type SkipPayload = {
  sessionId: string
  playerGuestId: string
  targetGuestId: string
  cycle: DeckCycle
}

export type ProfilePayload = {
  guestId: string
  fact: string
}

export type PlayerSession = {
  sessionId: string
  playerName: string
  playerGuestId: string
}

export type DeckCycle = 'initial' | 'replay-skipped'

export type DeckLocalState = {
  answeredCardIds: string[]
  skippedCardIds: string[]
  currentCycle: DeckCycle
}
