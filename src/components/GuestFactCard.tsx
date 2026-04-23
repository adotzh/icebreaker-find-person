import type { FormEvent } from 'react'
import type { DeckCard } from '../types'

type GuestFactCardProps = {
  card: DeckCard
  nextCard: DeckCard | null
  cardsLeft: number
  solvedCount: number
  guessValue: string
  hasGuessError: boolean
  submitting: boolean
  onGuessChange: (value: string) => void
  onSubmitGuess: () => void
  onSkip: () => void
}

export function GuestFactCard({
  card,
  nextCard,
  cardsLeft,
  solvedCount,
  guessValue,
  hasGuessError,
  submitting,
  onGuessChange,
  onSubmitGuess,
  onSkip,
}: GuestFactCardProps) {
  const toConversationPrompt = (fact: string): string => {
    const trimmed = fact.trim()
    if (!trimmed) {
      return ''
    }
    const normalized = trimmed.toLowerCase()
    if (normalized.includes('ask ') || trimmed.includes('?')) {
      return trimmed
    }
    return `${trimmed}... ask me for the story behind it`
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmitGuess()
  }

  return (
    <section className="deck-playground">
      <div className="deck-stage">
        {nextCard ? (
          <article className="guest-card card guest-card--next" aria-hidden="true">
            <p className="section-kicker">Next card</p>
            <p className="fact fact--preview">{nextCard.fact}</p>
          </article>
        ) : null}

        <article className="guest-card card guest-card--current">
          <header className="card-header">
            <p className="section-kicker">😏 This you?</p>
            <h2>Go find out.</h2>
          </header>
          <p className="fact">{toConversationPrompt(card.fact)}</p>
          <form onSubmit={handleSubmit} className="stack-form card-form">
            <label className="field">
              <span>Who do you think this is?</span>
              <input
                value={guessValue}
                onChange={(event) => onGuessChange(event.target.value)}
                placeholder="Take a guess or go ask them 👀"
                required
                disabled={submitting}
                className={hasGuessError ? 'input-error' : ''}
              />
            </label>
            <div className="card-footer">
              <p className="card-stats card-stats--plain">
                {cardsLeft} left · {solvedCount} found
              </p>
              <div className="action-bar action-bar--card">
                <button type="button" className="button-secondary" onClick={onSkip} disabled={submitting}>
                  Skip (need more clues)
                </button>
                <button type="submit" className="button-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : "That's my guess"}
                </button>
              </div>
            </div>
          </form>
        </article>
      </div>
    </section>
  )
}
