type ResultPopupProps = {
  open: boolean
  variant: 'success' | 'failed'
  title: string
  subtitle: string
  onClose: () => void
}

export function ResultPopup({ open, variant, title, subtitle, onClose }: ResultPopupProps) {
  if (!open) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <div className={`dialog card success-popup success-popup--${variant}`} role="status" aria-live="polite">
        <button type="button" className="popup-close" onClick={onClose} aria-label="Close popup">
          ×
        </button>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}
