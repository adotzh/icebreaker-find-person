import { useEffect, useMemo, useState } from 'react'
import {
  activateProfile,
  getDeck,
  getProfile,
  refreshDeck,
  selectCardsForCycle,
  skipCard,
  submitGuess,
} from './api/client'
import { ActivationCard } from './components/ActivationCard'
import { DeckEmptyState } from './components/DeckEmptyState'
import { GuestFactCard } from './components/GuestFactCard'
import { SkipConfirmDialog } from './components/SkipConfirmDialog'
import { StatusBanner } from './components/StatusBanner'
import {
  clearPlayerSession,
  createSessionId,
  getDeckState,
  getPlayerSession,
  markAnswered,
  markSkipped,
  resetDeckState,
  setDeckCycle,
  setPlayerSession,
} from './lib/storage'
import type { DeckCard, DeckCycle, DeckLocalState, Guest, PlayerSession } from './types'

function App() {
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{
    message: string
    variant: 'info' | 'success' | 'error'
  } | null>({
    message: 'Activate your profile to join the game and receive guest cards.',
    variant: 'info',
  })
  const [nameInput, setNameInput] = useState('')
  const [factInput, setFactInput] = useState('')
  const [profile, setProfile] = useState<Guest | null>(null)
  const [deckCards, setDeckCards] = useState<DeckCard[]>([])
  const [guessInput, setGuessInput] = useState('')
  const [showSkipDialog, setShowSkipDialog] = useState(false)

  const [playerSession, setPlayerSessionState] = useState<PlayerSession | null>(() =>
    getPlayerSession(),
  )
  const [deckState, setDeckStateState] = useState<DeckLocalState>(() => getDeckState())

  const activeCards = useMemo(
    () =>
      selectCardsForCycle(
        deckCards,
        deckState.answeredCardIds,
        deckState.skippedCardIds,
        deckState.currentCycle,
      ),
    [deckCards, deckState],
  )
  const currentCard = activeCards[0] ?? null

  const loadDeck = async (
    cycle: DeckCycle = deckState.currentCycle,
    shouldRefresh = false,
    sessionOverride?: PlayerSession,
  ) => {
    const activeSession = sessionOverride ?? playerSession
    if (!activeSession) {
      return
    }

    try {
      setLoading(true)
      const cards = shouldRefresh
        ? await refreshDeck(activeSession.playerGuestId, activeSession.sessionId)
        : await getDeck(activeSession.playerGuestId, activeSession.sessionId)
      setDeckCards(cards)
      const persisted = setDeckCycle(cycle)
      setDeckStateState(persisted)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load card deck.'
      setStatus({ message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!playerSession) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadDeck(getDeckState().currentCycle)
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFindProfile = async () => {
    try {
      setLoading(true)
      const result = await getProfile(nameInput)
      if (!result) {
        setProfile(null)
        setStatus({
          message: 'Profile not found. Try your full name from the guest list.',
          variant: 'error',
        })
        return
      }

      setProfile(result)
      setFactInput(result.fact)
      setStatus({
        message: `Welcome ${result.name}. Confirm your fact to activate your profile.`,
        variant: 'info',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load profile.'
      setStatus({ message, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!profile) {
      return
    }

    try {
      setActivating(true)
      const activatedProfile = await activateProfile({
        guestId: profile.id,
        fact: factInput,
      })

      const sessionId = playerSession?.sessionId ?? createSessionId()
      const session: PlayerSession = {
        sessionId,
        playerName: activatedProfile.name,
        playerGuestId: activatedProfile.id,
      }
      setPlayerSession(session)
      resetDeckState()
      setDeckStateState(getDeckState())
      setPlayerSessionState(session)
      setProfile(activatedProfile)
      setStatus({
        message: 'Profile activated. Start swiping guest cards.',
        variant: 'success',
      })
      await loadDeck('initial', true, session)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not activate profile.'
      setStatus({ message, variant: 'error' })
    } finally {
      setActivating(false)
    }
  }

  const handleSubmitGuess = async () => {
    if (!playerSession || !currentCard || !guessInput.trim()) {
      return
    }

    try {
      setSubmitting(true)
      const response = await submitGuess({
        sessionId: playerSession.sessionId,
        playerGuestId: playerSession.playerGuestId,
        targetGuestId: currentCard.id,
        answerName: guessInput,
        cycle: deckState.currentCycle,
      })
      const next = markAnswered(currentCard.id)
      setDeckStateState(next)
      setGuessInput('')
      setStatus({
        message:
          response.result === 'correct'
            ? 'Correct match. Nice work, hunter.'
            : 'Logged. Keep exploring and try the next guest.',
        variant: response.result === 'correct' ? 'success' : 'info',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit guess.'
      setStatus({ message, variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmSkip = async () => {
    if (!playerSession || !currentCard) {
      return
    }

    try {
      setSubmitting(true)
      await skipCard({
        sessionId: playerSession.sessionId,
        playerGuestId: playerSession.playerGuestId,
        targetGuestId: currentCard.id,
        cycle: deckState.currentCycle,
      })
      const next = markSkipped(currentCard.id)
      setDeckStateState(next)
      setStatus({
        message: 'Card skipped. You can replay skipped cards later.',
        variant: 'info',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not skip card.'
      setStatus({ message, variant: 'error' })
    } finally {
      setShowSkipDialog(false)
      setSubmitting(false)
    }
  }

  const handleReplaySkipped = () => {
    const next = setDeckCycle('replay-skipped')
    setDeckStateState(next)
    setStatus({
      message: 'Replay mode enabled. Showing cards you skipped earlier.',
      variant: 'info',
    })
  }

  const handleRefreshDeck = async () => {
    const next = setDeckCycle('initial')
    setDeckStateState(next)
    await loadDeck('initial', true)
    setStatus({
      message: 'Deck refreshed. New activated guests are now available.',
      variant: 'info',
    })
  }

  return (
    <div className="page-shell">
      <main className="page">
        <header className="hero">
          <p className="eyebrow">This You?</p>
          <h1>Start conversations without overthinking</h1>
          <p className="subtitle">
            You will see random facts about people at this party. Some impressive. Some chaotic.
            Some questionable. Your job is to figure out who is who by actually talking to people.
          </p>
          <div className="hero-meta">
            <span className="hero-badge">
              {loading ? 'Loading cards...' : `${activeCards.length} cards available`}
            </span>
            <span className="hero-badge">Cycle: {deckState.currentCycle}</span>
            {playerSession ? (
              <span className="hero-badge">Player: {playerSession.playerName}</span>
            ) : null}
          </div>
        </header>

        {status ? <StatusBanner variant={status.variant} message={status.message} /> : null}

        {!playerSession ? (
          <ActivationCard
            profile={profile}
            nameInput={nameInput}
            factInput={factInput}
            loading={loading}
            activating={activating}
            onNameInputChange={setNameInput}
            onFactInputChange={setFactInput}
            onFindProfile={handleFindProfile}
            onActivate={handleActivate}
          />
        ) : null}

        {playerSession && currentCard ? (
          <GuestFactCard
            card={currentCard}
            guessValue={guessInput}
            submitting={submitting}
            onGuessChange={setGuessInput}
            onSubmitGuess={handleSubmitGuess}
            onSkip={() => setShowSkipDialog(true)}
          />
        ) : null}

        {playerSession && !currentCard ? (
          <DeckEmptyState
            canReplay={
              deckState.skippedCardIds
                .filter((id) => !deckState.answeredCardIds.includes(id)).length > 0
            }
            onReplaySkipped={handleReplaySkipped}
            onRefresh={handleRefreshDeck}
            onResetSession={() => {
              clearPlayerSession()
              setPlayerSessionState(null)
              setProfile(null)
              setDeckCards([])
              resetDeckState()
              setDeckStateState(getDeckState())
              setNameInput('')
              setFactInput('')
              setGuessInput('')
              setStatus({
                message: 'Session reset. Activate your profile to play again.',
                variant: 'info',
              })
            }}
          />
        ) : null}
      </main>

      <SkipConfirmDialog
        open={showSkipDialog}
        onCancel={() => setShowSkipDialog(false)}
        onConfirm={handleConfirmSkip}
      />
    </div>
  )
}

export default App
