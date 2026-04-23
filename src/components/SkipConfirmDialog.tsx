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
        <h3>Skip this one?</h3>
        <p>We will keep it for your replay round.</p>
        <div className="action-bar">
          <button type="button" className="button-secondary" onClick={onCancel}>
            Keep this card
          </button>
          <button type="button" className="button-primary" onClick={onConfirm}>
            Yes, skip
          </button>
        </div>
      </div>
    </div>
  )
}
