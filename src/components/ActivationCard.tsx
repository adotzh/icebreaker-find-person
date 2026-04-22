import type { FormEvent } from 'react'
import type { Guest } from '../types'

type ActivationCardProps = {
  profile: Guest | null
  nameInput: string
  factInput: string
  loading: boolean
  activating: boolean
  onNameInputChange: (value: string) => void
  onFactInputChange: (value: string) => void
  onFindProfile: () => void
  onActivate: () => void
}

export function ActivationCard({
  profile,
  nameInput,
  factInput,
  loading,
  activating,
  onNameInputChange,
  onFactInputChange,
  onFindProfile,
  onActivate,
}: ActivationCardProps) {
  const handleFindSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onFindProfile()
  }

  const handleActivateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onActivate()
  }

  return (
    <section className="activation-screen card">
      <header className="card-header">
        <p className="section-kicker">Step 1</p>
        <h2>Activate your profile</h2>
      </header>
      <p className="card-description">
        Confirm your fact so others can discover you in the card deck.
      </p>

      <form onSubmit={handleFindSubmit} className="stack-form">
        <label className="field">
          <span>Your name</span>
          <input
            value={nameInput}
            onChange={(event) => onNameInputChange(event.target.value)}
            placeholder="Type your full name"
            required
            disabled={loading || activating}
          />
        </label>
        <button type="submit" className="button-primary" disabled={loading || activating}>
          Find my profile
        </button>
      </form>

      {profile ? (
        <form onSubmit={handleActivateSubmit} className="stack-form">
          <label className="field">
            <span>Your fact</span>
            <textarea
              value={factInput}
              onChange={(event) => onFactInputChange(event.target.value)}
              placeholder="Share a fun fact about yourself"
              rows={4}
              required
              disabled={activating}
            />
          </label>
          <button type="submit" className="button-primary" disabled={activating}>
            {activating ? 'Activating...' : 'Activate and start playing'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
