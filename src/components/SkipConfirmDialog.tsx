type SkipConfirmDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function SkipConfirmDialog({ open, onCancel, onConfirm }: SkipConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog card" role="dialog" aria-modal="true" aria-label="Confirm skip">
        <h3>Skip this card?</h3>
        <p>You can replay skipped cards later.</p>
        <div className="action-bar">
          <button type="button" className="button-secondary" onClick={onCancel}>
            Keep card
          </button>
          <button type="button" className="button-primary" onClick={onConfirm}>
            Confirm skip
          </button>
        </div>
      </div>
    </div>
  )
}
