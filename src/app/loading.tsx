export default function Loading() {
  return (
    <main className="workspace-page w-full px-4 py-5 sm:px-6" role="status" aria-label="Loading page">
      <span className="sr-only">Opening your workspace…</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-bg-secondary" />
        <div className="h-12 animate-pulse rounded-lg border border-border bg-bg-card" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-lg border border-border bg-bg-card" />)}
        </div>
        <div className="h-40 animate-pulse rounded-lg border border-border bg-bg-card" />
      </div>
    </main>
  );
}
