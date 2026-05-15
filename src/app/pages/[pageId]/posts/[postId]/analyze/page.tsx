'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageToken } from '@/hooks/usePageToken';
import { getPost } from '@/lib/api/pagePosts';
import { getPostInsights } from '@/lib/api/postInsights';
import type { PostInsights } from '@/lib/api/postInsights';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleTabs } from '@/components/optimize/AngleTabs';
import type { PagePost } from '@/lib/types';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import type { PostAnalysisPayload } from '@/app/api/post-analysis/route';

type AnalysisStep = 'loading-post' | 'analyzing' | 'done' | 'error';

function fmt(n: number | undefined) {
  if (n === undefined) return '—';
  return n.toLocaleString('en-US');
}

function pct(n: number, d: number | undefined) {
  if (!d) return null;
  return ((n / d) * 100).toFixed(2) + '%';
}

function MetricPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${highlight ? 'bg-accent/10 border border-accent/20' : 'bg-white/[0.04] border border-border/50'}`}>
      <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? 'text-accent' : 'text-text-primary'}`}>{value}</span>
    </div>
  );
}

function PostPreview({ post, insights, followersCount }: {
  post: PagePost;
  insights: PostInsights;
  followersCount?: number;
}) {
  const reactions = post.reactions?.summary.total_count ?? post.likes?.summary.total_count ?? 0;
  const comments = post.comments?.summary.total_count ?? 0;
  const shares = post.shares?.count ?? 0;
  const totalEngagement = reactions + comments + shares;
  const text = post.message || post.story || '';

  const engRate = pct(totalEngagement, insights.reach);
  const shareRate = pct(shares, insights.reach);
  const reachPct = pct(insights.reach ?? 0, followersCount);

  return (
    <div className="glass-card gradient-border-card rounded-2xl overflow-hidden mb-5">
      {post.full_picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.full_picture} alt="Post" className="w-full aspect-video object-cover" />
      )}
      <div className="p-4">
        {text && <p className="text-sm text-text-primary mb-3 line-clamp-3 leading-relaxed">{text}</p>}

        <div className="flex items-center justify-between mb-4 text-xs text-text-muted">
          <span>{new Date(post.created_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          {post.permalink_url && (
            <a href={post.permalink_url} target="_blank" rel="noopener noreferrer"
              className="text-accent hover:text-accent/80 transition-colors">
              View post →
            </a>
          )}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <MetricPill label="Reactions" value={fmt(reactions)} />
          <MetricPill label="Comments" value={fmt(comments)} />
          <MetricPill label="Shares" value={fmt(shares)} highlight={shares > reactions * 0.05} />
        </div>

        {(insights.reach || insights.impressions) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
            {insights.impressions !== undefined && (
              <MetricPill label="Impressions" value={fmt(insights.impressions)} />
            )}
            {insights.reach !== undefined && (
              <MetricPill label="Reach" value={fmt(insights.reach)} />
            )}
            {engRate && (
              <MetricPill label="Eng. Rate" value={engRate} highlight={parseFloat(engRate) >= 1} />
            )}
            {shareRate && (
              <MetricPill label="Share Rate" value={shareRate} highlight={parseFloat(shareRate) >= 0.5} />
            )}
          </div>
        )}

        {(reachPct || insights.clicks !== undefined) && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {reachPct && followersCount && (
              <MetricPill label={`Reach / ${fmt(followersCount)} followers`} value={reachPct} />
            )}
            {insights.clicks !== undefined && (
              <MetricPill label="Clicks" value={fmt(insights.clicks)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function detectPostType(post: PagePost): PostAnalysisPayload['post_type'] {
  if (post.full_picture) {
    // Rough heuristic: videos often have a thumbnail but no direct image URL ending in .jpg
    return 'photo';
  }
  const text = post.message || post.story || '';
  if (/https?:\/\//.test(text)) return 'link';
  return 'text';
}

export default function PostAnalyzePage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ pageId: string; postId: string }>();
  const { pageId, postId } = params;

  const searchParams = useSearchParams();
  const pageToken = usePageToken(pageId, auth.token);

  // Page context passed via searchParams from parent screen (avoids re-fetching all pages)
  const followersCount = searchParams.get('followersCount') ? Number(searchParams.get('followersCount')) : undefined;
  const pageCategory = searchParams.get('pageCategory') ?? undefined;

  const [post, setPost] = useState<PagePost | null>(null);
  const [insights, setInsights] = useState<PostInsights>({});
  const [step, setStep] = useState<AnalysisStep>('loading-post');
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
  }, [auth.isLoading, auth.token, router]);

  // Step 1: Fetch post data + insights in parallel
  useEffect(() => {
    if (!pageToken || !postId) return;
    setStep('loading-post');

    Promise.all([
      getPost(postId, pageToken),
      getPostInsights(postId, pageToken),
    ])
      .then(([postData, insightData]) => {
        setPost(postData);
        setInsights(insightData);
        setStep('analyzing');
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load post.');
        setStep('error');
      });
  }, [postId, pageToken]);

  // Step 2: Run AI analysis once post is loaded
  useEffect(() => {
    if (step !== 'analyzing' || !post) return;

    const reactions = post.reactions?.summary.total_count ?? post.likes?.summary.total_count ?? 0;

    const payload: PostAnalysisPayload = {
      // Content
      message: post.message,
      story: post.story,
      created_time: post.created_time,
      has_media: !!post.full_picture,
      post_type: detectPostType(post),
      // Engagement
      reactions,
      comments: post.comments?.summary.total_count ?? 0,
      shares: post.shares?.count ?? 0,
      // Reach & delivery
      impressions: insights.impressions,
      reach: insights.reach,
      engaged_users: insights.engagedUsers,
      clicks: insights.clicks,
      // Page context (passed via searchParams from parent)
      followers_count: followersCount,
      page_category: pageCategory,
    };

    const controller = new AbortController();

    fetch('/api/post-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed.');
        setAnalysis(data as GeminiAnalysis);
        setStep('done');
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Analysis failed.');
        setStep('error');
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, post]);

  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <div className="mb-5">
        <Breadcrumb
          items={[
            { label: 'Pages', href: '/pages' },
            { label: searchParams.get('pageName') ?? pageId, href: `/pages/${pageId}` },
            { label: 'AI Post Analysis' },
          ]}
        />
        <div className="flex items-center gap-2 mt-3">
          <span className="text-accent text-xl leading-none">✦</span>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">AI Post Analysis</h1>
        </div>
        <p className="text-sm text-text-muted mt-1">
          Analyzes engagement quality, content, reach, and viral potential
        </p>
      </div>

      {/* Post preview */}
      {post && (
        <PostPreview
          post={post}
          insights={insights}
          followersCount={followersCount}
        />
      )}

      {/* Loading post */}
      {step === 'loading-post' && (
        <div className="glass-card rounded-2xl p-5 mb-5 space-y-3 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="h-3 bg-white/5 rounded w-1/4 mt-2" />
        </div>
      )}

      {/* Analyzing */}
      {step === 'analyzing' && (
        <div className="glass-card gradient-border-card rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-accent/20" />
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-accent text-xl">✦</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-text-primary font-semibold">Analyzing post…</p>
            <p className="text-text-muted text-sm mt-1">AI is evaluating engagement, content quality, and reach signals</p>
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="glass-card gradient-border-card rounded-2xl p-5 text-center">
          <p className="text-status-red text-sm mb-4">{error}</p>
          <button
            onClick={() => { setError(null); setStep('analyzing'); }}
            className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Results */}
      {step === 'done' && analysis && (
        <div className="space-y-5">
          <ScoreCard score={analysis.overallScore} summary={analysis.summary} />
          {analysis.angles && analysis.angles.length > 0 && (
            <AngleTabs angles={analysis.angles} />
          )}
        </div>
      )}
    </PageContainer>
  );
}
