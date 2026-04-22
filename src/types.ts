export type Guest = {
  id: string
  name: string
  fact: string
  active: boolean
}

export type AttemptPayload = {
  playerName: string
  assignedGuestId: string
  assignedGuestName: string
  answerName: string
  isCorrect: boolean
  sessionId: string
}

export type WinnerPayload = {
  playerName: string
  assignedGuestName: string
  sessionId: string
}

export type PlayerSession = {
  sessionId: string
  playerName: string
  playerGuestId: string
}

export type Assignment = {
  sessionId: string
  targetGuestId: string
  targetGuestName: string
}
