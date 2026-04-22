type DeckEmptyStateProps = {
  canReplay: boolean
  onReplaySkipped: () => void
  onRefresh: () => void
  onResetSession: () => void
}

export function DeckEmptyState({
  canReplay,
  onReplaySkipped,
  onRefresh,
  onResetSession,
}: DeckEmptyStateProps) {
  return (
    <section className="card deck-empty">
      <header className="card-header">
        <p className="section-kicker">Deck status</p>
        <h2>No cards for now</h2>
      </header>
      <p className="card-description">
        You can refresh to pull newly activated guests, or replay skipped cards.
      </p>
      <div className="stack-form">
        <button type="button" className="button-primary" onClick={onRefresh}>
          Refresh deck
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={onReplaySkipped}
          disabled={!canReplay}
        >
          Replay skipped cards
        </button>
        <button type="button" className="button-secondary" onClick={onResetSession}>
          Reset player session
        </button>
      </div>
    </section>
  )
}
