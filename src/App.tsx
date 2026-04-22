import { useEffect, useMemo, useState } from 'react'
import { fetchGuests, logAttempt, logWinner } from './api/client'
import { AnswerForm } from './components/AnswerForm'
import { ChallengeCard } from './components/ChallengeCard'
import { NameEntryForm } from './components/NameEntryForm'
import { StatusBanner } from './components/StatusBanner'
import { isNameMatch, matchGuestByName, pickTargetGuest } from './lib/matching'
import {
  clearPlayerSession,
  createSessionId,
  getAssignment,
  getPlayerSession,
  hasWinnerMark,
  setAssignment,
  setPlayerSession,
  setWinnerMark,
} from './lib/storage'
import type { Assignment, Guest, PlayerSession } from './types'

function App() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{
    message: string
    variant: 'info' | 'success' | 'error'
  } | null>(null)

  const [playerSession, setPlayerSessionState] = useState<PlayerSession | null>(() =>
    getPlayerSession(),
  )
  const [assignment, setAssignmentState] = useState<Assignment | null>(() => {
    const existingSession = getPlayerSession()
    const existingAssignment = getAssignment()
    if (!existingAssignment) {
      return null
    }

    if (existingSession && existingAssignment.sessionId !== existingSession.sessionId) {
      return null
    }

    return existingAssignment
  })

  useEffect(() => {
    const loadGuests = async () => {
      try {
        setLoading(true)
        const loadedGuests = await fetchGuests()
        setGuests(loadedGuests)
        setStatus({ message: 'Guest list is ready. Enter your name to begin.', variant: 'info' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load guests.'
        setStatus({ message, variant: 'error' })
      } finally {
        setLoading(false)
      }
    }

    void loadGuests()
  }, [])

  const assignedGuest = useMemo(
    () => guests.find((guest) => guest.id === assignment?.targetGuestId) ?? null,
    [assignment, guests],
  )

  const handleNameSubmit = (playerNameRaw: string) => {
    if (loading || guests.length === 0) {
      return
    }

    const playerGuest = matchGuestByName(guests, playerNameRaw)
    if (!playerGuest) {
      setStatus({
        message: 'We could not match your name. Try your full name as listed by the event host.',
        variant: 'error',
      })
      return
    }

    if (guests.length <= 1) {
      setStatus({
        message: 'Not enough active guests to start the challenge.',
        variant: 'error',
      })
      return
    }

    const sessionId = playerSession?.sessionId ?? createSessionId()
    const nextSession: PlayerSession = {
      sessionId,
      playerName: playerGuest.name,
      playerGuestId: playerGuest.id,
    }

    let nextAssignment = assignment
    if (!nextAssignment || nextAssignment.sessionId !== sessionId) {
      const targetGuest = pickTargetGuest(guests, playerGuest.id)
      if (!targetGuest) {
        setStatus({
          message: 'Unable to assign a target right now. Please ask the host for help.',
          variant: 'error',
        })
        return
      }

      nextAssignment = {
        sessionId,
        targetGuestId: targetGuest.id,
        targetGuestName: targetGuest.name,
      }
      setAssignment(nextAssignment)
      setAssignmentState(nextAssignment)
    }

    setPlayerSession(nextSession)
    setPlayerSessionState(nextSession)
    setStatus({
      message: `Welcome, ${nextSession.playerName}. Your mission is ready.`,
      variant: 'info',
    })
  }

  const handleAnswerSubmit = async (answerNameRaw: string) => {
    if (!playerSession || !assignment || !assignedGuest) {
      return
    }

    const isCorrect = isNameMatch(answerNameRaw, assignedGuest.name)

    setSubmitting(true)
    try {
      await logAttempt({
        playerName: playerSession.playerName,
        assignedGuestId: assignment.targetGuestId,
        assignedGuestName: assignment.targetGuestName,
        answerName: answerNameRaw,
        isCorrect,
        sessionId: playerSession.sessionId,
      })

      if (!isCorrect) {
        setStatus({
          message: 'Not quite. Keep talking and try one more guess.',
          variant: 'error',
        })
        return
      }

      if (!hasWinnerMark(playerSession.sessionId)) {
        await logWinner({
          playerName: playerSession.playerName,
          assignedGuestName: assignment.targetGuestName,
          sessionId: playerSession.sessionId,
        })
        setWinnerMark(playerSession.sessionId)
      }

      setStatus({
        message: 'Super, awesome! You are in the raffle pool.',
        variant: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not submit answer right now.'
      setStatus({ message, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">QR Icebreaker Challenge</p>
        <h1>Find your person</h1>
        <p className="subtitle">
          Meet someone new using one fun fact from the guest list.
        </p>
      </header>

      {status ? <StatusBanner variant={status.variant} message={status.message} /> : null}

      {!playerSession ? (
        <NameEntryForm disabled={loading} onSubmit={handleNameSubmit} />
      ) : null}

      {playerSession && assignedGuest ? (
        <>
          <ChallengeCard fact={assignedGuest.fact} />
          <AnswerForm disabled={submitting} onSubmit={handleAnswerSubmit} />
          <button
            type="button"
            className="secondary"
            onClick={() => {
              clearPlayerSession()
              setPlayerSessionState(null)
              setAssignmentState(null)
              setStatus({ message: 'Session reset. Enter your name again.', variant: 'info' })
            }}
          >
            Reset session
          </button>
        </>
      ) : null}
    </main>
  )
}

export default App
