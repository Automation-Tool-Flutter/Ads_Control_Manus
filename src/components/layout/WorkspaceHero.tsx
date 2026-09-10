interface WorkspaceHeroProps {
  title: string;
  count?: number | string;
  countLabel?: string;
}

export function WorkspaceHero({
  title,
  count,
  countLabel = "items",
}: WorkspaceHeroProps) {
  return (
    <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-5">
      <h1 className="min-w-0 text-xl font-semibold leading-tight tracking-tight text-text-primary sm:text-2xl">
        {title}
      </h1>
      {count !== undefined && (
        <span
          className="inline-flex shrink-0 items-center rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary"
          aria-label={`${count} ${countLabel}`}
          title={`${count} ${countLabel}`}
        >
          {count}
        </span>
      )}
    </header>
  );
}
