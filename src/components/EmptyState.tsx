interface EmptyStateProps {
  title: string
  hint?: string
}

/** Shown when a list/endpoint returns no rows. */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {hint ? <p className="empty-hint">{hint}</p> : null}
    </div>
  )
}
