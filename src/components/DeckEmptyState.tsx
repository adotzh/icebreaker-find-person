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
        <p className="section-kicker">Round complete</p>
        <h2>You cleared this deck</h2>
      </header>
      <p className="card-description">
        No new cards right now. Check for new guests or replay what you skipped.
      </p>
      <div className="stack-form">
        <button type="button" className="button-primary" onClick={onRefresh}>
          Check for new guests
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
          Restart profile
        </button>
      </div>
    </section>
  )
}
