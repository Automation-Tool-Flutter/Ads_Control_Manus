'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePages } from '@/hooks/usePages';
import { usePagePosts } from '@/hooks/usePagePosts';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { useCreativeIntelligence } from '@/hooks/useCreativeIntelligence';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/ui/LoadingState';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { BoostModal } from '@/components/pages/BoostModal';
import { useToast } from '@/components/ui/Toaster';
import type { PagePost } from '@/lib/types';

const VERDICT_STYLE = {
  winner: 'bg-status-green/10 text-status-green border-status-green/30',
  average: 'bg-bg-secondary text-text-secondary border-border',
  loser: 'bg-status-red/10 text-status-red border-status-red/30',
  fatigue: 'bg-status-yellow/10 text-status-yellow border-status-yellow/30',
};

export default function CreativeIntelligencePage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { pageId } = useParams<{ pageId: string }>();
  const { toast } = useToast();
  const { state: pagesState } = usePages(auth.token);
  const page = pagesState.status === 'success' ? pagesState.data.find(item => item.id === pageId) : undefined;
  const pageToken = page?.access_token ?? null;
  const { state: postsState } = usePagePosts(pageId, pageToken);
  const { state: accountsState } = useAdAccounts(auth.token);
  const { state, analyze } = useCreativeIntelligence();
  const [accountId, setAccountId] = useState('');
  const [boostPost, setBoostPost] = useState<PagePost | null>(null);

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  useEffect(() => {
    if (!accountId && accountsState.status === 'success' && accountsState.data[0]) setAccountId(accountsState.data[0].id);
  }, [accountId, accountsState]);

  const account = accountsState.status === 'success' ? accountsState.data.find(item => item.id === accountId) : undefined;
  const posts = postsState.status === 'success' ? postsState.data : [];
  const ready = Boolean(page && account && auth.token && postsState.status === 'success');

  function runAnalysis() {
    if (page && account && auth.token) analyze(page, posts, account, auth.token);
  }

  if (auth.isLoading) return null;
  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[{ label: 'Pages', href: '/pages' }, { label: page?.name ?? pageId, href: `/pages/${pageId}` }, { label: 'Creative Intelligence' }]}
        eyebrow="Organic + paid intelligence"
        title="AI Creative Intelligence"
        description="Find winning content patterns, compare paid creatives, detect fatigue signals, and generate new variants and a creative brief."
        badge="Meta Ads AI vision + metrics"
        stats={state.status === 'success' ? [
          { label: 'confidence', value: `${state.analysis.confidence}%`, tone: 'blue' },
          { label: 'boost ideas', value: state.analysis.boostCandidates.length, tone: 'green' },
          { label: 'variants', value: state.analysis.variants.length, tone: 'amber' },
        ] : []}
      >
        <div className="flex flex-wrap items-center gap-2">
          <select value={accountId} onChange={event => setAccountId(event.target.value)} className="min-w-56 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-primary">
            <option value="">Select ad account</option>
            {accountsState.status === 'success' && accountsState.data.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
          </select>
          <button type="button" onClick={runAnalysis} disabled={!ready || state.status === 'loading'} className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white disabled:opacity-40">{state.status === 'success' ? 'Analyze again' : 'Analyze creatives'}</button>
        </div>
      </ControlHeader>

      {(pagesState.status === 'loading' || postsState.status === 'loading' || accountsState.status === 'loading' || state.status === 'loading') && <LoadingState />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={runAnalysis} />}
      {postsState.status === 'error' && <ErrorState message={postsState.error} />}

      {state.status === 'idle' && postsState.status === 'success' && (
        <div className="rounded-2xl border border-border bg-bg-card p-8 text-center">
          <p className="font-bold text-text-primary">Ready to compare {posts.length} organic posts with paid ads</p>
          <p className="mt-2 text-sm text-text-secondary">Choose an ad account, then run the analysis. Images, copy, CTA and objective-aware performance metrics will be evaluated together.</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-bg-card p-5">
            <p className="text-[10px] font-black uppercase text-accent">Creative readout</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{state.analysis.summary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-status-green/25 bg-status-green/[0.06] p-4"><h2 className="font-bold text-status-green">Winning patterns</h2><ul className="mt-2 space-y-2">{state.analysis.winningPatterns.map((item, index) => <li key={index} className="text-sm text-text-secondary">• {item}</li>)}</ul></div>
              <div className="rounded-xl border border-status-red/25 bg-status-red/[0.05] p-4"><h2 className="font-bold text-status-red">Losing patterns</h2><ul className="mt-2 space-y-2">{state.analysis.losingPatterns.map((item, index) => <li key={index} className="text-sm text-text-secondary">• {item}</li>)}</ul></div>
            </div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Organic opportunities</p><h2 className="text-lg font-bold text-text-primary">Posts recommended for boost</h2></div>
            <div className="grid gap-3 lg:grid-cols-2">
              {state.analysis.boostCandidates.map(candidate => {
                const post = posts.find(item => item.id === candidate.postId);
                return <article key={candidate.postId} className="overflow-hidden rounded-2xl border border-border bg-bg-card">
                  {post?.full_picture && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.full_picture} alt="" className="h-44 w-full object-cover" />
                  )}
                  <div className="p-4"><div className="flex items-center justify-between gap-2"><p className="font-bold text-text-primary">{candidate.postLabel}</p><span className="text-lg font-black text-status-green">{candidate.score}/100</span></div><p className="mt-2 text-sm text-text-secondary">{candidate.reason}</p><p className="mt-2 text-xs font-semibold text-text-muted">Suggested objective: {candidate.suggestedObjective}</p>{post && <button onClick={() => setBoostPost(post)} className="mt-3 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white">Boost this post</button>}</div>
                </article>;
              })}
            </div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Paid creative comparison</p><h2 className="text-lg font-bold text-text-primary">Winners, losers and fatigue signals</h2></div>
            <div className="grid gap-3 lg:grid-cols-2">{state.analysis.adAssessments.map(item => <article key={item.adId} className="rounded-2xl border border-border bg-bg-card p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-text-primary">{item.adName}</p><code className="text-[10px] text-text-muted">{item.adId}</code></div><span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${VERDICT_STYLE[item.verdict]}`}>{item.verdict} · {item.score}</span></div><p className="mt-3 text-sm text-text-secondary">{item.evidence}</p><div className="mt-3 rounded-lg bg-bg-secondary p-3"><p className="text-[10px] font-bold uppercase text-accent">Refresh recommendation</p><p className="mt-1 text-xs text-text-secondary">{item.refreshRecommendation}</p></div></article>)}</div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Generated concepts</p><h2 className="text-lg font-bold text-text-primary">Three creative variants</h2></div>
            <div className="grid gap-3 lg:grid-cols-3">{state.analysis.variants.map((variant, index) => <article key={`${variant.basedOnId}-${index}`} className="rounded-2xl border border-border bg-bg-card p-4"><div className="flex justify-between gap-2"><span className="text-[10px] font-black uppercase text-accent">Variant {index + 1}</span><span className="text-[10px] font-bold uppercase text-text-muted">{variant.format}</span></div><h3 className="mt-3 font-bold text-text-primary">{variant.headline}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{variant.primaryText}</p><p className="mt-3 text-xs font-bold text-accent">CTA: {variant.cta}</p><button onClick={() => { navigator.clipboard.writeText(`${variant.headline}\n\n${variant.primaryText}\n\nCTA: ${variant.cta}`); toast('Variant copied', 'success'); }} className="mt-3 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text-secondary">Copy variant</button></article>)}</div>
          </section>

          <section className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-5"><p className="text-[10px] font-black uppercase text-accent">Designer handoff</p><h2 className="mt-1 text-lg font-bold text-text-primary">{state.analysis.creativeBrief.concept}</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{[['Audience', state.analysis.creativeBrief.audience], ['Hook', state.analysis.creativeBrief.hook], ['Visual direction', state.analysis.creativeBrief.visualDirection], ['Key message', state.analysis.creativeBrief.keyMessage], ['CTA', state.analysis.creativeBrief.cta], ['Format', state.analysis.creativeBrief.format]].map(([label, value]) => <div key={label} className="rounded-lg bg-bg-card p-3"><p className="text-[10px] font-bold uppercase text-text-muted">{label}</p><p className="mt-1 text-sm text-text-secondary">{value}</p></div>)}</div><h3 className="mt-4 text-sm font-bold text-text-primary">Test plan</h3><ol className="mt-2 space-y-2">{state.analysis.creativeBrief.testPlan.map((step, index) => <li key={index} className="text-sm text-text-secondary">{index + 1}. {step}</li>)}</ol></section>
        </div>
      )}

      {boostPost && page && accountsState.status === 'success' && auth.token && <BoostModal post={boostPost} pageId={pageId} adAccounts={accountsState.data} token={auth.token} onClose={() => setBoostPost(null)} onSuccess={() => { setBoostPost(null); toast('Post boosted successfully!', 'success'); }} />}
    </PageContainer>
  );
}
