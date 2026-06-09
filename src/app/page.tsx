"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoading && state.token) router.replace("/businesses");
    if (!state.isLoading && !state.token) router.replace("/login");
  }, [state.isLoading, state.token, router]);

  if (state.isLoading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="h-12 w-12 rounded-2xl border-2 border-accent/20 border-t-accent animate-spin" />
      </div>
    );
  }

  return null;
}

function LandingPage() {
  return (
    <main className="px-3 py-4 sm:px-6 sm:py-10">
      <section className="mx-auto grid max-w-[1400px] gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="meta-panel min-h-[620px] overflow-hidden bg-text-primary p-6 text-white sm:p-10">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex rounded-md border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/70">
                Meta operations OS
              </div>
              <h1 className="mt-8 max-w-4xl text-5xl font-black leading-tight text-white sm:text-7xl lg:text-8xl">
                Turn ad work into a control room.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                Ads Control reorganizes Meta accounts, campaigns, Pages,
                content, comments, insights, and AI recommendations into one
                focused operating system.
              </p>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-center">
              <Link
                href="/login"
                className="mobile-action inline-flex items-center justify-center rounded-lg bg-white px-6 text-sm font-black text-text-primary"
              >
                Connect Facebook
              </Link>
              <a
                href="#workzones"
                className="mobile-action inline-flex items-center justify-center rounded-lg border border-white/20 px-6 text-sm font-black text-white/82"
              >
                View work zones
              </a>
              <div className="hidden h-px bg-white/16 sm:block" />
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <Panel title="Finance desk" value="$4.8K" label="sample spend">
            Track balances, spend caps, currency, account status, and campaign
            entry points without jumping between tools.
          </Panel>
          <Panel title="AI review board" value="92" label="action score">
            Keep recommendations next to campaign and post data so decisions
            stay grounded in the source signal.
          </Panel>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="meta-item p-5">
                <p className="text-3xl font-black text-text-primary">{stat.value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workzones" className="mx-auto mt-4 max-w-[1400px]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`meta-item p-5 ${
                index === 0
                  ? "bg-accent text-white"
                  : "text-text-primary"
              }`}
            >
              <span className={`text-xs font-black uppercase tracking-[0.2em] ${index === 0 ? "text-white/65" : "text-accent"}`}>
                0{index + 1}
              </span>
              <h2 className="mt-8 text-2xl font-black">{feature.title}</h2>
              <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-white/75" : "text-text-secondary"}`}>
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Panel({
  title,
  value,
  label,
  children,
}: {
  title: string;
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="meta-item p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
            {title}
          </p>
          <p className="mt-4 text-5xl font-black text-text-primary">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-text-muted">
            {label}
          </p>
        </div>
        <span className="h-12 w-12 rounded-lg bg-bg-secondary" />
      </div>
      <p className="mt-6 text-sm leading-6 text-text-secondary">{children}</p>
    </section>
  );
}

const stats = [
  { value: "4", label: "work zones" },
  { value: "19", label: "screens" },
  { value: "AI", label: "review layer" },
  { value: "API", label: "live data" },
];

const features = [
  {
    title: "Asset map",
    description:
      "Navigate business portfolios, catalogs, Pages, users, and ad accounts from a board layout.",
  },
  {
    title: "Account control",
    description:
      "Inspect spend, balance, caps, currency, and campaign access as compact operating cards.",
  },
  {
    title: "Publishing desk",
    description:
      "Move through Pages, posts, scheduled content, comments, and settings without a table-heavy UI.",
  },
  {
    title: "Decision layer",
    description:
      "Use AI scores and recommendations as a review layer beside source performance data.",
  },
];
