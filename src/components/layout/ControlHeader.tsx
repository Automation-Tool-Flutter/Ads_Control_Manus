import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";

interface HeaderStat {
  label: string;
  value: ReactNode;
  tone?: "blue" | "green" | "amber" | "neutral";
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
  neutral: "border-border bg-bg-card text-text-secondary",
};

export function ControlHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  badge = "GPT layer",
  stats = [],
  actions,
  children,
  compact = false,
}: ControlHeaderProps) {
  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-border bg-bg-card shadow-sm">
      <div className="border-b border-border bg-bg-secondary/65 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : <span />}
          <span className="inline-flex items-center gap-2 rounded-md border border-accent/20 bg-accent/8 px-2.5 py-1 text-[10px] font-black uppercase text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {badge}
          </span>
        </div>
      </div>

      <div className={`grid gap-4 px-3 ${compact ? "py-3" : "py-4"} sm:px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end`}>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-text-primary sm:text-3xl">
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
              <div className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
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
        <div className="border-t border-border bg-bg-secondary/45 px-3 py-3 sm:px-4">
          {children}
        </div>
      )}
    </section>
  );
}
