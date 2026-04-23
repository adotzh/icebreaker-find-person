import { useEffect, useMemo, useRef, useState } from 'react'
import {
  activateProfile,
  getDeck,
  getProgress,
  getProfile,
  refreshDeck,
  selectCardsForCycle,
  skipCard,
  submitGuess,
} from './api/client'
import { ActivationCard } from './components/ActivationCard'
import { AccountDialog } from './components/AccountDialog'
import { DeckEmptyState } from './components/DeckEmptyState'
import { GuestFactCard } from './components/GuestFactCard'
import { ResultPopup } from './components/ResultPopup'
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
  setDeckState,
  setDeckCycle,
  setPlayerSession,
} from './lib/storage'
import type { DeckCard, DeckCycle, DeckLocalState, Guest, PlayerSession } from './types'

type ThemeId = 'neon-night' | 'playful-editorial' | 'soft-3d'
type StatusState = {
  message: string
  variant: 'info' | 'success' | 'error'
}

const THEME_STORAGE_KEY = 'icebreaker:ui-theme'

function App() {
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<StatusState | null>({
    message: 'Activate your profile to join the game and receive guest cards.',
    variant: 'info',
  })
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [factInput, setFactInput] = useState('')
  const [profile, setProfile] = useState<Guest | null>(null)
  const [profileLookupAttempted, setProfileLookupAttempted] = useState(false)
  const [deckCards, setDeckCards] = useState<DeckCard[]>([])
  const [guessInput, setGuessInput] = useState('')
  const [showSkipDialog, setShowSkipDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [lastGuessResult, setLastGuessResult] = useState<'success' | 'failed' | null>(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showFailedPopup, setShowFailedPopup] = useState(false)
  const advanceTimerRef = useRef<number | null>(null)
  const failedPopupTimerRef = useRef<number | null>(null)
  const pendingSuccessCardIdRef = useRef<string | null>(null)
  const [theme] = useState<ThemeId>(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'neon-night' || stored === 'playful-editorial' || stored === 'soft-3d') {
      return stored
    }
    return 'soft-3d'
  })

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
  const nextCard = activeCards[1] ?? null

  const clearFailedPopupTimer = () => {
    if (failedPopupTimerRef.current) {
      window.clearTimeout(failedPopupTimerRef.current)
      failedPopupTimerRef.current = null
    }
  }

  const clearFailedGuessState = () => {
    clearFailedPopupTimer()
    setShowFailedPopup(false)
    setLastGuessResult(null)
  }

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current)
      }
      clearFailedPopupTimer()
      pendingSuccessCardIdRef.current = null
    }
  }, [])

  const finalizeSuccessAdvance = () => {
    const cardId = pendingSuccessCardIdRef.current
    if (!cardId) {
      setShowSuccessPopup(false)
      return
    }

    const next = markAnswered(cardId)
    setDeckStateState(next)
    setShowSuccessPopup(false)
    pendingSuccessCardIdRef.current = null
  }

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
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const hydrateProgressFromBackend = async (session: PlayerSession): Promise<DeckLocalState> => {
    const localState = getDeckState()
    try {
      const remoteState = await getProgress(session.playerGuestId)
      const merged: DeckLocalState = {
        answeredCardIds: Array.from(
          new Set([...localState.answeredCardIds, ...remoteState.answeredCardIds]),
        ),
        skippedCardIds: Array.from(
          new Set([...localState.skippedCardIds, ...remoteState.skippedCardIds]),
        ).filter((id) => !localState.answeredCardIds.includes(id) && !remoteState.answeredCardIds.includes(id)),
        currentCycle: localState.currentCycle === 'replay-skipped' ? 'replay-skipped' : remoteState.currentCycle,
      }
      setDeckState(merged)
      setDeckStateState(merged)
      return merged
    } catch {
      return localState
    }
  }

  useEffect(() => {
    if (!playerSession) {
      return
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        const mergedState = await hydrateProgressFromBackend(playerSession)
        await loadDeck(mergedState.currentCycle, false, playerSession)
      })()
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFindProfile = async () => {
    setRegistrationNotice(null)
    setProfileLookupAttempted(false)
    setProfile(null)
    setFactInput('')
    try {
      setLoading(true)
      const result = await getProfile(nameInput)
      if (!result) {
        setProfileLookupAttempted(true)
        setStatus({
          message:
            'Profile not found. Add a fact below and we will create your profile.',
          variant: 'info',
        })
        return
      }

      setProfile(result)
      setFactInput(result.fact)
      setProfileLookupAttempted(true)
      setStatus({
        message: `Hey ${result.name}. Confirm your fact and join the hunt.`,
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
    const trimmedName = nameInput.trim()
    const trimmedFact = factInput.trim()
    if (!trimmedName || !trimmedFact) {
      setStatus({
        message: 'Please provide your name and a fact before activating.',
        variant: 'error',
      })
      return
    }

    try {
      setRegistrationNotice(null)
      setActivating(true)
      const activatedProfile = await activateProfile({
        guestId: profile?.id,
        name: trimmedName,
        fact: trimmedFact,
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
      setProfileLookupAttempted(true)
      setStatus({
        message: 'Profile activated. Start your first card.',
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
      if (response.result === 'correct') {
        clearFailedGuessState()
        setShowSuccessPopup(true)
        pendingSuccessCardIdRef.current = currentCard.id
        setStatus({
          message: 'Nice. You found them.',
          variant: 'success',
        })
        setGuessInput('')

        if (advanceTimerRef.current) {
          window.clearTimeout(advanceTimerRef.current)
        }
        advanceTimerRef.current = window.setTimeout(() => {
          finalizeSuccessAdvance()
          advanceTimerRef.current = null
        }, 5000)
      } else {
        setLastGuessResult('failed')
        setShowSuccessPopup(false)
        setShowFailedPopup(true)
        setStatus({
          message: 'Not them. But now you know one more person.',
          variant: 'info',
        })
        clearFailedPopupTimer()
        failedPopupTimerRef.current = window.setTimeout(() => {
          setShowFailedPopup(false)
          failedPopupTimerRef.current = null
        }, 5000)
      }
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
      clearFailedGuessState()
      setStatus({
        message: 'Skipped. You can revisit it in replay.',
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
    clearFailedGuessState()
    setStatus({
      message: 'Replay mode enabled. Showing cards you skipped earlier.',
      variant: 'info',
    })
  }

  const handleRefreshDeck = async () => {
    const next = setDeckCycle('initial')
    setDeckStateState(next)
    clearFailedGuessState()
    await loadDeck('initial', true)
    setStatus({
      message: 'Deck refreshed. New activated guests are now available.',
      variant: 'info',
    })
  }

  const restartSession = () => {
    clearPlayerSession()
    setPlayerSessionState(null)
    setProfile(null)
    setDeckCards([])
    resetDeckState()
    setDeckStateState(getDeckState())
    setNameInput('')
    setFactInput('')
    setProfileLookupAttempted(false)
    setGuessInput('')
    setShowSkipDialog(false)
    setShowSuccessPopup(false)
    clearFailedGuessState()
    pendingSuccessCardIdRef.current = null
    setShowAccountDialog(false)
    setStatus({
      message: 'Profile reset completed.',
      variant: 'success',
    })
    setRegistrationNotice('Session restarted. Enter your name to start again.')
  }

  return (
    <div className="page-shell">
      {!playerSession ? (
        <main className="page registration-page">
          {registrationNotice ? <p className="registration-notice">{registrationNotice}</p> : null}
          {status && status.variant === 'error' ? (
            <StatusBanner variant={status.variant} message={status.message} />
          ) : null}

          <ActivationCard
            profile={profile}
            profileLookupAttempted={profileLookupAttempted}
            nameInput={nameInput}
            factInput={factInput}
            loading={loading}
            activating={activating}
            onNameInputChange={setNameInput}
            onFactInputChange={setFactInput}
            onFindProfile={handleFindProfile}
            onActivate={handleActivate}
          />
        </main>
      ) : (
        <main className="page game-page">
          <button
            type="button"
            className="account-fab"
            onClick={() => setShowAccountDialog(true)}
            aria-label="Open account page"
          >
            Account
          </button>

          {loading ? (
            <section className="card deck-empty" aria-live="polite">
              <header className="card-header">
                <h2>Preparing your cards...</h2>
              </header>
              <p className="card-description">Loading the next fact challenge.</p>
            </section>
          ) : null}

          {!loading && currentCard ? (
          <GuestFactCard
            card={currentCard}
            nextCard={nextCard}
            cardsLeft={activeCards.length}
            solvedCount={deckState.answeredCardIds.length}
            guessValue={guessInput}
            hasGuessError={lastGuessResult === 'failed'}
            submitting={submitting}
            onGuessChange={(value) => {
              setGuessInput(value)
              if (lastGuessResult === 'failed') {
                setLastGuessResult(null)
              }
            }}
            onSubmitGuess={handleSubmitGuess}
            onSkip={() => setShowSkipDialog(true)}
          />
          ) : null}

          {!loading && !currentCard ? (
          <DeckEmptyState
            canReplay={
              deckState.skippedCardIds
                .filter((id) => !deckState.answeredCardIds.includes(id)).length > 0
            }
            onReplaySkipped={handleReplaySkipped}
            onRefresh={handleRefreshDeck}
            onResetSession={restartSession}
          />
          ) : null}
        </main>
      )}

      <SkipConfirmDialog
        open={showSkipDialog}
        onCancel={() => setShowSkipDialog(false)}
        onConfirm={handleConfirmSkip}
      />
      <ResultPopup
        open={showSuccessPopup}
        variant="success"
        title="Nice. You found them."
        subtitle="Loading the next card..."
        onClose={() => {
          if (advanceTimerRef.current) {
            window.clearTimeout(advanceTimerRef.current)
            advanceTimerRef.current = null
          }
          finalizeSuccessAdvance()
        }}
      />
      <ResultPopup
        open={showFailedPopup}
        variant="failed"
        title="Not them. But now you know one more person."
        subtitle="Take another guess or keep exploring."
        onClose={() => {
          clearFailedPopupTimer()
          setShowFailedPopup(false)
        }}
      />
      {playerSession ? (
        <AccountDialog
          open={showAccountDialog}
          playerName={playerSession.playerName}
          cycle={deckState.currentCycle}
          solvedCount={deckState.answeredCardIds.length}
          cardsAvailable={activeCards.length}
          onClose={() => setShowAccountDialog(false)}
          onRestartSession={restartSession}
        />
      ) : null}
    </div>
  )
}

export default App
