import { useState } from 'react'
import type { FormEvent } from 'react'

type AnswerFormProps = {
  disabled?: boolean
  onSubmit: (answer: string) => void
}

export function AnswerForm({ disabled, onSubmit }: AnswerFormProps) {
  const [answerName, setAnswerName] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(answerName)
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="card-header">
        <p className="section-kicker">Step 3</p>
        <h2>Submit your answer</h2>
      </div>
      <label className="field">
        <span>Who did you find?</span>
        <input
          type="text"
          value={answerName}
          onChange={(event) => setAnswerName(event.target.value)}
          placeholder="Name of the person"
          required
          disabled={disabled}
        />
      </label>
      <button type="submit" disabled={disabled} className="button-primary">
        Submit answer
      </button>
    </form>
  )
}
