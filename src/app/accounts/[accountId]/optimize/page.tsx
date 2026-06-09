"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOptimizeData } from "@/hooks/useOptimizeData";
import { PageContainer } from "@/components/layout/PageContainer";
import { ControlHeader } from "@/components/layout/ControlHeader";
import { AnalyzeButton } from "@/components/optimize/AnalyzeButton";
import { StepProgress } from "@/components/optimize/StepProgress";
import { ScoreCard } from "@/components/optimize/ScoreCard";
import { AngleTabs } from "@/components/optimize/AngleTabs";

export default function OptimizePage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;

  useEffect(() => {
    if (!auth.isLoading && !auth.token) {
      router.replace("/login");
    }
  }, [auth.isLoading, auth.token, router]);

  const { state, analyze } = useOptimizeData(accountId, auth.token);

  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[
            { label: "Accounts", href: "/accounts" },
            { label: accountId, href: `/accounts/${accountId}` },
            { label: "GPT Optimize" },
        ]}
        eyebrow="Account optimization"
        title="GPT Analysis & Optimization"
        description="Collect Meta Ads performance signals and turn them into prioritized optimization recommendations."
        badge="Meta Ads + GPT"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* Analyze trigger */}
          <AnalyzeButton step={state.step} onAnalyze={analyze} />

          {/* Step progress animation */}
          <StepProgress step={state.step} />

          {/* Error state */}
          {state.step === "error" && state.error && (
            <div className="rounded-lg border border-status-red/25 bg-status-red/10 px-4 py-3 text-sm text-status-red">
              <p className="mb-1 font-semibold">An error occurred</p>
              <p>{state.error}</p>
            </div>
          )}

          {/* Results */}
          {state.step === "done" && state.analysis && (
            <>
              <ScoreCard
                score={state.analysis.overallScore}
                summary={state.analysis.summary}
              />
              {state.analysis.angles.length > 0 && (
                <AngleTabs angles={state.analysis.angles} />
              )}
            </>
          )}
        </div>

        <aside className="space-y-3 xl:sticky xl:top-5 xl:self-start">
          <div className="meta-panel overflow-hidden">
            <div className="border-b border-border bg-text-primary px-4 py-3 text-white">
              <p className="text-[10px] font-black uppercase text-white/70">GPT operator</p>
              <h2 className="mt-1 text-base font-black">Optimization copilot</h2>
            </div>
            <div className="space-y-3 p-4">
              {[
                ["1", "Collect Meta delivery data"],
                ["2", "Build campaign context"],
                ["3", "Return prioritized actions"],
              ].map(([n, label]) => (
                <div key={n} className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 p-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent/12 text-xs font-black text-accent">
                    {n}
                  </span>
                  <span className="text-sm font-semibold text-text-secondary">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="meta-panel p-4">
            <p className="text-[10px] font-black uppercase text-text-muted">Current state</p>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-bg-secondary/55 px-3 py-2.5">
              <span className="text-sm font-semibold text-text-secondary">Analysis step</span>
              <span className="rounded-md bg-accent/10 px-2 py-1 text-xs font-black uppercase text-accent">
                {state.step}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
