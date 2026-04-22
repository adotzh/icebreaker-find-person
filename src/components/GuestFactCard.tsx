import type { FormEvent } from 'react'
import type { DeckCard } from '../types'

type GuestFactCardProps = {
  card: DeckCard
  guessValue: string
  submitting: boolean
  onGuessChange: (value: string) => void
  onSubmitGuess: () => void
  onSkip: () => void
}

export function GuestFactCard({
  card,
  guessValue,
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
    <section className="guest-card card">
      <header className="card-header">
        <p className="section-kicker">Current card</p>
        <h2>Who is this guest?</h2>
      </header>
      <p className="fact">{card.fact}</p>
      <form onSubmit={handleSubmit} className="stack-form">
        <label className="field">
          <span>Guest name</span>
          <input
            value={guessValue}
            onChange={(event) => onGuessChange(event.target.value)}
            placeholder="Type your guess"
            required
            disabled={submitting}
          />
        </label>
        <div className="action-bar">
          <button type="button" className="button-secondary" onClick={onSkip} disabled={submitting}>
            Skip
          </button>
          <button type="submit" className="button-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </section>
  )
}
