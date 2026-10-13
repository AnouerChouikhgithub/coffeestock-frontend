interface LoadingStateProps {
  label?: string
}

/** Spinner + live label for pending requests. */
export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
