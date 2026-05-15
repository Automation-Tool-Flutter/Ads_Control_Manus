"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOptimizeData } from "@/hooks/useOptimizeData";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
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
      router.replace("/");
    }
  }, [auth.isLoading, auth.token, router]);

  const { state, analyze } = useOptimizeData(accountId, auth.token);

  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: "Accounts", href: "/accounts" },
            { label: accountId, href: `/accounts/${accountId}` },
            { label: "AI Analysis" },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">
          AI Analysis & Optimization
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Get comprehensive ad performance analysis and optimization
          recommendations from AI.
        </p>
      </div>

      <div className="space-y-4">
        {/* Analyze trigger */}
        <AnalyzeButton step={state.step} onAnalyze={analyze} />

        {/* Step progress animation */}
        <StepProgress step={state.step} />

        {/* Error state */}
        {state.step === "error" && state.error && (
          <div className="bg-status-red/10 border border-status-red/20 rounded-2xl px-5 py-4 text-status-red text-sm">
            <p className="font-semibold mb-1">An error occurred</p>
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
    </PageContainer>
  );
}
