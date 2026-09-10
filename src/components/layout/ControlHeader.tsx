import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";

interface HeaderStat {
  label: string;
  value: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "neutral";
}

interface ControlHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  stats?: HeaderStat[];
  actions?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}

const toneClass: Record<NonNullable<HeaderStat["tone"]>, string> = {
  blue: "border-accent/20 bg-accent/8 text-accent",
  green: "border-status-green/20 bg-status-green/8 text-status-green",
  amber: "border-status-yellow/25 bg-status-yellow/10 text-status-yellow",
  red: "border-status-red/25 bg-status-red/10 text-status-red",
  neutral: "border-border bg-bg-card text-text-secondary",
};

export function ControlHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  badge = "AI Intelligence",
  stats = [],
  actions,
  children,
  compact = false,
}: ControlHeaderProps) {
  return (
    <section className="workspace-heading mb-6 overflow-hidden rounded-3xl border border-border bg-bg-card">
      <div className={`control-breadcrumb-row border-b border-border/60 px-4 py-3 sm:px-6 ${breadcrumbs?.length ? '' : 'hidden lg:block'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {breadcrumbs ? <Breadcrumb items={breadcrumbs} mobileShowCurrent={false} /> : <span />}
          <span className="hidden items-center gap-2 rounded-md border border-accent/20 bg-accent/8 px-2.5 py-1 text-[10px] font-black uppercase text-accent lg:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {badge}
          </span>
        </div>
      </div>

      <div className={`grid gap-5 px-4 ${compact ? "py-4" : "py-6"} sm:px-6 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-end`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-accent">
            {eyebrow}
          </p><span className="control-mobile-badge lg:hidden">{badge}</span></div>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-text-primary sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-4xl text-sm font-medium leading-6 text-text-secondary">
              {description}
            </p>
          )}
        </div>

        {(stats.length > 0 || actions) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:justify-end">
            {stats.length > 0 && (
              <div className="control-stats grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className={`min-w-[7.25rem] rounded-lg border px-3 py-2 ${toneClass[stat.tone ?? "neutral"]}`}
                  >
                    <div className="text-lg font-black tabular-nums text-text-primary">
                      {stat.value}
                    </div>
                    <div className="mt-0.5 text-[10px] font-black uppercase opacity-75">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        )}
      </div>

      {children && (
        <div className="border-t border-border/60 bg-bg-secondary/30 px-4 py-4 sm:px-6">
          {children}
        </div>
      )}
    </section>
  );
}
