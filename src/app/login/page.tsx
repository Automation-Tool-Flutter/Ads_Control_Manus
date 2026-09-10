"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { FacebookLoginButton } from "@/components/facebook/FacebookLoginButton";
import { STORAGE_KEYS } from "@/lib/constants";
import { clearCookieValue, getCookieValue } from "@/lib/facebook-oauth";

export default function LoginPage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoading && state.token) {
      const returnTo =
        localStorage.getItem(STORAGE_KEYS.OAUTH_RETURN_TO) ??
        getCookieValue(STORAGE_KEYS.OAUTH_RETURN_TO);
      localStorage.removeItem(STORAGE_KEYS.OAUTH_RETURN_TO);
      clearCookieValue(STORAGE_KEYS.OAUTH_RETURN_TO);
      router.replace(returnTo?.startsWith("/") && returnTo !== "/login" ? returnTo : "/accounts");
    }
  }, [state.isLoading, state.token, router]);

  return (
    <main className="login-workspace flex-1 grid items-center gap-8 p-5 sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="ai-command rounded-[32px] p-7 text-white sm:p-12">
        <p className="text-xs font-semibold tracking-[.2em] text-sky-100/70">Meta Ads AI / INTELLIGENCE WORKSPACE</p>
        <h2 className="mt-8 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Smarter advertising.<br />Starts with intelligence.</h2>
        <p className="mt-6 max-w-lg text-sm leading-7 text-sky-100">One workspace for analysis, campaigns, and creative strategy. Work with AI throughout your workflow to turn questions into informed actions.</p>
        <div className="mt-10 space-y-3">{[['01', 'Ask AI in context', 'Explore advertising data using natural language.'], ['02', 'Evidence-led optimization', 'Compare KPIs, budgets, and performance against the right objective.'], ['03', 'Learn from outcomes', 'Track recommendations and improve the next optimization cycle.']].map(([number, title, detail]) => <div key={number} className="flex gap-4 rounded-2xl border border-white/15 p-4"><span className="font-mono text-xs text-sky-100/70">{number}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-sky-100/70">{detail}</p></div></div>)}</div>
      </section>
      <div className="mx-auto w-full max-w-[460px]">
        <div className="meta-panel p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <BrandLogo size={56} decorative />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                CONNECT YOUR WORKSPACE
              </p>
              <h1 className="text-2xl font-bold text-text-primary leading-tight">
                Meta Ads AI
              </h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-text-secondary">
            Connect Facebook to bring ad accounts, campaigns, content, and AI analysis into one workspace.
          </p>

          <div className="mt-6">
            <FacebookLoginButton />
          </div>

          <div className="mt-5 rounded-lg border border-border bg-bg-secondary/60 p-4 text-left">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
              Access requested
            </p>
            <ul className="space-y-2.5">
              {[
                "Read ad accounts, campaigns, and ad sets",
                "Update campaign status and budgets",
                "View and publish Page posts",
                "Read Page insights and performance signals",
                "Access Business portfolio assets",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent shrink-0" />
                  <span className="text-xs leading-5 text-text-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
