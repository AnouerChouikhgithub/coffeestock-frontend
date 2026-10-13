import type { ReactNode } from 'react'

export type AlertVariant = 'error' | 'success' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title: string
  children?: ReactNode
}

/** Inline status/feedback block. Errors use role="alert" so screen readers
 * announce them; success/info are polite. */
export function Alert({ variant = 'info', title, children }: AlertProps) {
  const role = variant === 'error' ? 'alert' : 'status'

  return (
    <div className={`alert alert-${variant}`} role={role}>
      <strong className="alert-title">{title}</strong>
      {children ? <div className="alert-body">{children}</div> : null}
    </div>
  )
}
