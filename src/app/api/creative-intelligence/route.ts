import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import { deriveCampaignKpis } from '@/lib/campaign-kpis';
import type { CreativeAnalysis, CreativeAnalysisPayload } from '@/lib/types/creative-intelligence';

const SYSTEM_PROMPT = `You are a Meta Ads creative strategist. Compare organic posts and paid ads using only supplied content and metrics. Separate observed patterns from hypotheses. High organic engagement does not guarantee paid conversion performance. Never invent IDs, results, brand facts, product claims, or audience facts. Produce concise English copy and actionable creative tests.`;

const SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    winningPatterns: { type: 'array', items: { type: 'string' } },
    losingPatterns: { type: 'array', items: { type: 'string' } },
    boostCandidates: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      postId: { type: 'string' }, postLabel: { type: 'string' }, score: { type: 'integer', minimum: 0, maximum: 100 }, reason: { type: 'string' }, suggestedObjective: { type: 'string' },
    }, required: ['postId', 'postLabel', 'score', 'reason', 'suggestedObjective'] } },
    adAssessments: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      adId: { type: 'string' }, adName: { type: 'string' }, verdict: { type: 'string', enum: ['winner', 'average', 'loser', 'fatigue'] }, score: { type: 'integer', minimum: 0, maximum: 100 }, evidence: { type: 'string' }, refreshRecommendation: { type: 'string' },
    }, required: ['adId', 'adName', 'verdict', 'score', 'evidence', 'refreshRecommendation'] } },
    variants: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      basedOnId: { type: 'string' }, headline: { type: 'string' }, primaryText: { type: 'string' }, cta: { type: 'string', enum: ['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'GET_QUOTE', 'CONTACT_US', 'MESSAGE_PAGE', 'DOWNLOAD', 'BOOK_NOW', 'APPLY_NOW', 'NO_BUTTON'] }, format: { type: 'string', enum: ['image', 'video', 'carousel', 'collection'] },
    }, required: ['basedOnId', 'headline', 'primaryText', 'cta', 'format'] } },
    creativeBrief: { type: 'object', additionalProperties: false, properties: {
      concept: { type: 'string' }, audience: { type: 'string' }, hook: { type: 'string' }, visualDirection: { type: 'string' }, keyMessage: { type: 'string' }, cta: { type: 'string' }, format: { type: 'string' }, testPlan: { type: 'array', items: { type: 'string' } },
    }, required: ['concept', 'audience', 'hook', 'visualDirection', 'keyMessage', 'cta', 'format', 'testPlan'] },
  },
  required: ['summary', 'confidence', 'winningPatterns', 'losingPatterns', 'boostCandidates', 'adAssessments', 'variants', 'creativeBrief'],
};

function engagement(post: CreativeAnalysisPayload['posts'][number], followers = 0) {
  const reactions = post.reactions?.summary.total_count ?? post.likes?.summary.total_count ?? 0;
  const comments = post.comments?.summary.total_count ?? 0;
  const shares = post.shares?.count ?? 0;
  const weighted = reactions + comments * 2 + shares * 3;
  return { reactions, comments, shares, weighted, engagementRate: followers > 0 ? weighted / followers * 100 : null };
}

function buildInput(payload: CreativeAnalysisPayload) {
  const posts = payload.posts.slice(0, 20).map(post => ({
    id: post.id, text: post.message ?? post.story ?? '', createdTime: post.created_time,
    statusType: post.status_type, engagement: engagement(post, payload.page.followersCount),
    hasImage: Boolean(post.full_picture),
  }));
  const ads = [...payload.ads].sort((a, b) => Number(b.insights?.data?.[0]?.spend || 0) - Number(a.insights?.data?.[0]?.spend || 0)).slice(0, 30).map(ad => {
    const insight = ad.insights?.data?.[0];
    return {
      id: ad.id, name: ad.name, status: ad.status, effectiveStatus: ad.effective_status,
      campaign: ad.campaign, adset: ad.adset, headline: ad.creative?.title, body: ad.creative?.body,
      cta: ad.creative?.call_to_action_type, objectStoryId: ad.creative?.object_story_id,
      metrics: insight, objectiveKpis: deriveCampaignKpis(ad.campaign?.objective, insight),
      hasImage: Boolean(ad.creative?.image_url || ad.creative?.thumbnail_url),
    };
  });
  const visualInputs = [
    ...payload.posts.slice(0, 20).map(post => ({ sourceId: post.id, url: post.full_picture })),
    ...ads.map(ad => { const source = payload.ads.find(item => item.id === ad.id); return { sourceId: ad.id, url: source?.creative?.image_url || source?.creative?.thumbnail_url }; }),
  ].filter((item): item is { sourceId: string; url: string } => Boolean(item.url?.startsWith('https://'))).slice(0, 8);
  const prompt = `Analyze this Page's organic posts and paid creatives.\nPage: ${JSON.stringify(payload.page)}\nAd account: ${JSON.stringify(payload.account)}\n\nORGANIC POSTS:\n${JSON.stringify(posts)}\n\nPAID ADS:\n${JSON.stringify(ads)}\n\nIMAGE INPUT ORDER:\n${JSON.stringify(visualInputs.map((item, imageIndex) => ({ imageIndex, sourceId: item.sourceId })))}\n\nRules:\n- Rank organic posts by observed weighted engagement and engagement rate when followers are available. Return at most 5 boost candidates with exact post IDs.\n- Assess every supplied paid ad. Objective outcome KPIs outrank CTR/CPC. Mark fatigue only as a signal when frequency is elevated and engagement efficiency is weak; state limited confidence without trend data.\n- Winning/losing patterns must cite aggregate observations from at least two creatives when possible.\n- Generate exactly 3 distinct variants based on a real supplied post or ad ID. Preserve the language used in the source content. Do not invent product benefits.\n- Create one production-ready creative brief and a 3-step test plan.`;
  const imageUrls = visualInputs.map(item => item.url);
  return { prompt, imageUrls, postIds: new Set(posts.map(post => post.id)), adIds: new Set(ads.map(ad => ad.id)) };
}

function sanitize(analysis: CreativeAnalysis, postIds: Set<string>, adIds: Set<string>): CreativeAnalysis {
  const sourceIds = new Set([...Array.from(postIds), ...Array.from(adIds)]);
  return {
    ...analysis,
    boostCandidates: analysis.boostCandidates.filter(item => postIds.has(item.postId)),
    adAssessments: analysis.adAssessments.filter(item => adIds.has(item.adId)),
    variants: analysis.variants.filter(item => sourceIds.has(item.basedOnId)),
  };
}

export async function POST(request: NextRequest) {
  let payload: CreativeAnalysisPayload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!payload.page?.id || !payload.account?.id || !Array.isArray(payload.posts) || !Array.isArray(payload.ads)) return NextResponse.json({ error: 'Creative data is incomplete.' }, { status: 400 });
  if (!payload.posts.length && !payload.ads.length) return NextResponse.json({ error: 'No posts or ads are available to analyze.' }, { status: 422 });

  const input = buildInput(payload);
  const config = { temperature: 0.35, maxOutputTokens: 7000, schema: { name: 'creative_intelligence', value: SCHEMA }, imageUrls: input.imageUrls };
  try {
    let analysis: CreativeAnalysis;
    try {
      analysis = await callOpenAI<CreativeAnalysis>(SYSTEM_PROMPT, input.prompt, config);
    } catch (error) {
      if (!(error instanceof OpenAIError) || error.status !== 400 || !input.imageUrls.length) throw error;
      analysis = await callOpenAI<CreativeAnalysis>(SYSTEM_PROMPT, `${input.prompt}\n\nImage URLs could not be loaded; assess text and metrics only and lower confidence for visual conclusions.`, { ...config, imageUrls: [] });
    }
    return NextResponse.json(sanitize(analysis, input.postIds, input.adIds));
  } catch (error) {
    if (error instanceof OpenAIError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Creative intelligence analysis failed.' }, { status: 500 });
  }
}
