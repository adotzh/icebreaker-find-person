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
          <p className="section-kicker">Who said this?</p>
          </header>
          <p className="fact">{card.fact}</p>
          <form onSubmit={handleSubmit} className="stack-form card-form">
            <label className="field">
              <span>Type guest name</span>
              <input
                value={guessValue}
                onChange={(event) => onGuessChange(event.target.value)}
                placeholder="Who is this?"
                required
                disabled={submitting}
                className={hasGuessError ? 'input-error' : ''}
              />
            </label>
            <div className="card-footer">
              <p className="card-stats card-stats--plain">
                {cardsLeft} left · {solvedCount} solved
              </p>
              <div className="action-bar action-bar--card">
                <button type="button" className="button-secondary" onClick={onSkip} disabled={submitting}>
                  Skip for now
                </button>
                <button type="submit" className="button-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </form>
        </article>
      </div>
    </section>
  )
}
