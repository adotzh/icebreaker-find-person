import type { FormEvent } from 'react'
import type { Guest } from '../types'

type ActivationCardProps = {
  profile: Guest | null
  profileLookupAttempted: boolean
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
  profileLookupAttempted,
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

  const canEditFact = profileLookupAttempted && !loading
  const isCreateMode = profileLookupAttempted && !profile

  return (
    <section className="activation-screen card">
      <header className="card-header">
        <p className="section-kicker">😏 This You?</p>
        <h2>Skip the small talk. Start with something interesting.</h2>
      </header>
      <p className="card-description">
        You are about to get a random fact about someone here. Your mission is simple: find
        them by talking to people.
      </p>
      <p className="card-description">
        Yes, this is your official excuse to walk up to strangers.
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
          {loading ? 'Finding...' : 'Find me'}
        </button>
      </form>

      {canEditFact ? (
        <form onSubmit={handleActivateSubmit} className="stack-form">
          {isCreateMode ? (
            <p className="card-description">
              You are still a mystery... for now. Add a fact and let people come find you.
            </p>
          ) : null}
          <label className="field">
            <span>Your fun fact</span>
            <textarea
              value={factInput}
              onChange={(event) => onFactInputChange(event.target.value)}
              placeholder="Share a fun fact people can use to find you"
              rows={4}
              required
              disabled={activating}
            />
          </label>
          <button type="submit" className="button-primary" disabled={activating}>
            {activating
              ? 'Activating...'
              : isCreateMode
                ? 'Create profile and start'
                : 'I am in, let us play'}
          </button>
        </form>
      ) : null}
    </section>
  )
}
