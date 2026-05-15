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
    <section className="neo-panel relative mb-6 overflow-hidden p-5 sm:p-7">
      <div className="absolute right-[-4rem] top-[-6rem] h-56 w-56 rounded-full bg-accent/35 blur-3xl" />
      <div className="absolute bottom-[-5rem] left-[35%] h-48 w-48 rounded-full bg-status-green/25 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-black leading-[0.95] text-white sm:text-6xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/68 sm:text-base">
            {description}
          </p>
        </div>
        {count !== undefined && (
          <div className="w-full rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:w-48">
            <p className="text-4xl font-black text-white tabular-nums">
              {count}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/58">
              {countLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
