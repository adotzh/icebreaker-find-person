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
      <h2>Start the Icebreaker</h2>
      <p>Enter your full name so we can match you in the guest list.</p>
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
      <button type="submit" disabled={disabled}>
        Find my challenge
      </button>
    </form>
  )
}
