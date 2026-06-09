interface WorkspaceHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  count?: number | string;
  countLabel?: string;
}

export function WorkspaceHero({
  eyebrow,
  title,
  description,
  count,
  countLabel = "items",
}: WorkspaceHeroProps) {
  return (
    <section className="meta-panel mb-6 overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-border bg-bg-card p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-wide text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-text-primary sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-text-secondary sm:text-base">
            {description}
          </p>
        </div>
        {count !== undefined && (
          <div className="w-full rounded-lg border border-border bg-bg-secondary p-4 sm:w-48">
            <p className="text-3xl font-black text-text-primary tabular-nums">
              {count}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-text-muted">
              {countLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
