import { useState } from 'react'
import type { FormEvent } from 'react'

type NameEntryFormProps = {
  disabled?: boolean
  onSubmit: (name: string) => void
}

export function NameEntryForm({ disabled, onSubmit }: NameEntryFormProps) {
  const [name, setName] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(name)
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <p className="section-kicker">Step 1</p>
        <h2>Enter your name</h2>
      </div>
      <p className="card-description">
        Use your full name as listed by the host to unlock your private challenge.
      </p>
      <label className="field">
        <span>Your name</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Alex Morgan"
          required
          disabled={disabled}
        />
      </label>
      <button type="submit" disabled={disabled} className="button-primary">
        Find my challenge
      </button>
    </form>
  )
}
