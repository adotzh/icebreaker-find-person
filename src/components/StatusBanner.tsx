type StatusBannerProps = {
  variant: 'info' | 'success' | 'error'
  message: string
}

export function StatusBanner({ variant, message }: StatusBannerProps) {
  return <p className={`status-banner status-banner--${variant}`}>{message}</p>
}
