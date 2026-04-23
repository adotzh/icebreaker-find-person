type AccountDialogProps = {
  open: boolean
  playerName: string
  cycle: string
  solvedCount: number
  cardsAvailable: number
  onClose: () => void
  onRestartSession: () => void
}

export function AccountDialog({
  open,
  playerName,
  cycle,
  solvedCount,
  cardsAvailable,
  onClose,
  onRestartSession,
}: AccountDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog card" role="dialog" aria-modal="true" aria-label="Account settings">
        <header className="card-header">
          <p className="section-kicker">Account</p>
          <h3>{playerName}</h3>
        </header>
        <p className="card-description">Cards available now: {cardsAvailable}</p>
        <p className="card-description">Cycle: {cycle}</p>
        <p className="card-description">Cards solved: {solvedCount}</p>
        <div className="action-bar">
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="button-primary" onClick={onRestartSession}>
            Restart session
          </button>
        </div>
      </div>
    </div>
  )
}
