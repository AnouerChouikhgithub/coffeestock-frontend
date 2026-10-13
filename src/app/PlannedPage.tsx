interface PlannedPageProps {
  title: string
}

/** Placeholder for sections that ship in Phase 7. Keeps the route resolvable
 * so navigation and deep links don't break inside the SPA. */
export function PlannedPage({ title }: PlannedPageProps) {
  return (
    <div className="page">
      <h1>{title}</h1>
      <p className="page-subtitle">
        This section is part of the approved roadmap and will be built in a later phase.
      </p>
    </div>
  )
}
