import { NextRequest, NextResponse } from 'next/server';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import { callGemini, GeminiError } from '@/lib/gemini';

const SYSTEM_PROMPT = `You are a senior Facebook content strategist and organic growth analyst. \
Your job is to analyze individual Facebook post performance using real metrics and provide deep, \
specific, data-driven recommendations. Always reference actual numbers. Identify root causes, not just symptoms. \
Evaluate content structure, audience engagement quality, viral coefficient, and algorithmic signals. \
Return valid JSON only. All content must be in English.`;

export interface PostAnalysisPayload {
  // Content
  message?: string;
  story?: string;
  created_time: string;
  has_media: boolean;
  post_type: 'photo' | 'video' | 'text' | 'link';

  // Engagement (always available)
  reactions: number;
  comments: number;
  shares: number;

  // Reach & delivery (from post insights — may be undefined if permission not granted)
  impressions?: number;
  reach?: number;
  engaged_users?: number;
  clicks?: number;

  // Page context
  followers_count?: number;
  page_category?: string;
}

function pct(n: number, d: number) {
  if (!d) return '—';
  return `${((n / d) * 100).toFixed(2)}%`;
}

function fmt(n: number | undefined) {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('en-US');
}

function buildPrompt(post: PostAnalysisPayload): string {
  const text = post.message || post.story || '(no text content)';
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const hasHashtags = /#\w+/.test(text);
  const hasEmojis = /[\uD83C-\uDBFF\uDC00-\uDFFF]|\u2600-\u27FF/.test(text);
  const hasQuestion = /[?？]/.test(text);
  const hasLink = /https?:\/\//.test(text);
  const hasCTA =
    /\b(xem|click|mua|đặt|đăng ký|liên hệ|inbox|dm|bình luận|share|tag|like|follow|register|buy|shop|order|comment|check out|learn more|get|subscribe|join|sign up|try|book|call|visit|download)\b/i.test(text);

  const postedDate = new Date(post.created_time);
  const dayOfWeek = postedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const hourOfDay = postedDate.getHours();
  const timeSlot =
    hourOfDay >= 6 && hourOfDay < 9 ? 'morning (6-9am)' :
    hourOfDay >= 9 && hourOfDay < 12 ? 'late morning (9am-12pm)' :
    hourOfDay >= 12 && hourOfDay < 14 ? 'lunchtime (12-2pm)' :
    hourOfDay >= 14 && hourOfDay < 18 ? 'afternoon (2-6pm)' :
    hourOfDay >= 18 && hourOfDay < 22 ? 'evening (6-10pm)' :
    'off-peak (10pm-6am)';

  const totalEngagement = post.reactions + post.comments + post.shares;

  // Derived rates
  const engagementRate = post.reach ? pct(totalEngagement, post.reach) : '—';
  const reactionRate = post.reach ? pct(post.reactions, post.reach) : '—';
  const commentRate = post.reach ? pct(post.comments, post.reach) : '—';
  const shareRate = post.reach ? pct(post.shares, post.reach) : '—';
  const clickRate = post.reach && post.clicks ? pct(post.clicks, post.reach) : '—';
  const organicReachRate = post.impressions && post.reach
    ? pct(post.reach, post.impressions)
    : '—';
  const engagedUserRate = post.reach && post.engaged_users
    ? pct(post.engaged_users, post.reach)
    : '—';
  const shareToReactionRatio =
    post.reactions > 0 ? (post.shares / post.reactions).toFixed(3) : '—';
  const commentToReactionRatio =
    post.reactions > 0 ? (post.comments / post.reactions).toFixed(3) : '—';

  // Follower-based rates (if available)
  const impressionPerFollower = post.followers_count && post.impressions
    ? pct(post.impressions, post.followers_count)
    : '—';
  const reachPerFollower = post.followers_count && post.reach
    ? pct(post.reach, post.followers_count)
    : '—';

  const hasInsights = post.reach !== undefined || post.impressions !== undefined;

  return `Analyze the following Facebook post using all available metrics.

━━━ POST CONTENT ━━━
Type: ${post.post_type}${post.has_media ? ' with media' : ''}
Posted: ${dayOfWeek}, ${postedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${timeSlot} (${postedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})

Content (${wordCount} words, ${charCount} chars):
"${text.slice(0, 800)}"${text.length > 800 ? '...(truncated)' : ''}

Content signals:
- Has hashtags: ${hasHashtags}
- Has emojis: ${hasEmojis}
- Has question (engagement hook): ${hasQuestion}
- Has link: ${hasLink}
- Has CTA: ${hasCTA}

━━━ PAGE CONTEXT ━━━
${post.page_category ? `Category: ${post.page_category}` : ''}
${post.followers_count ? `Followers/Fans: ${fmt(post.followers_count)}` : 'Followers: not provided'}

━━━ ENGAGEMENT METRICS ━━━
Reactions:     ${fmt(post.reactions)}
Comments:      ${fmt(post.comments)}
Shares:        ${fmt(post.shares)}
Total engagement: ${fmt(totalEngagement)}
Share/Reaction ratio: ${shareToReactionRatio} ${parseFloat(shareToReactionRatio) > 0.1 ? '✓ strong viral signal' : ''}
Comment/Reaction ratio: ${commentToReactionRatio}

${hasInsights ? `━━━ REACH & DELIVERY METRICS ━━━
Impressions:   ${fmt(post.impressions)} ${impressionPerFollower !== '—' ? `(${impressionPerFollower} of followers)` : ''}
Reach:         ${fmt(post.reach)} ${reachPerFollower !== '—' ? `(${reachPerFollower} of followers)` : ''}
Organic reach rate: ${organicReachRate} (reach/impressions — lower = more re-shows to same people)
Engaged users: ${fmt(post.engaged_users)} (${engagedUserRate} of reach)
Clicks:        ${fmt(post.clicks)} (${clickRate} of reach)

Engagement rate: ${engagementRate} of reach
Reaction rate:   ${reactionRate} of reach
Comment rate:    ${commentRate} of reach
Share rate:      ${shareRate} of reach

BENCHMARKS (Facebook organic):
- Good engagement rate: ≥ 1% of reach
- Strong share rate: ≥ 0.5% of reach
- Healthy reach rate: ≥ 30% of followers per post` : '⚠ Reach/impression insights not available — analyze based on engagement counts only'}

━━━ ANALYSIS ANGLES ━━━
Provide 4 angles: "Engagement Quality", "Content & Copywriting", "Reach & Virality", "Optimization Opportunities"

Return a JSON object with EXACT schema:
{
  "summary": "3-4 sentences covering: overall performance verdict, strongest metric, biggest gap, one priority action — reference actual numbers",
  "overallScore": <0-100>,
  "angles": [
    {
      "name": "Engagement Quality",
      "level": "campaign",
      "score": <0-100>,
      "strengths": ["specific strength with numbers, e.g. 'Share rate of 0.8% is 2x Facebook average'"],
      "issues": ["specific issue with numbers and why it matters algorithmically"],
      "recommendations": [
        {
          "title": "Short action title",
          "description": "Specific, step-by-step action explaining what to do, why, and expected outcome",
          "priority": "high|medium|low",
          "metric": "reactions|comments|shares|engagement_rate"
        }
      ]
    },
    {
      "name": "Content & Copywriting",
      "level": "ad",
      "score": <0-100>,
      "strengths": ["content quality observation"],
      "issues": ["content weakness affecting performance"],
      "recommendations": [
        {
          "title": "Short action title",
          "description": "Exact content improvement with example or template if helpful",
          "priority": "high|medium|low",
          "metric": "comments|shares|reach"
        }
      ]
    },
    {
      "name": "Reach & Virality",
      "level": "account",
      "score": <0-100>,
      "strengths": ["reach or distribution strength"],
      "issues": ["reach limitation or distribution problem"],
      "recommendations": [
        {
          "title": "Short action title",
          "description": "How to improve organic reach or virality coefficient",
          "priority": "high|medium|low",
          "metric": "reach|impressions|shares"
        }
      ]
    },
    {
      "name": "Optimization Opportunities",
      "level": "adset",
      "score": <0-100>,
      "strengths": ["what is already optimized (timing, format, etc)"],
      "issues": ["missed optimization opportunity"],
      "recommendations": [
        {
          "title": "Short action title",
          "description": "Tactical improvement for next posts — be specific about timing, format, or structure",
          "priority": "high|medium|low",
          "metric": "reach|engagement_rate|shares"
        }
      ]
    }
  ]
}

SCORING GUIDE:
- Overall 80-100: Post performing well above average
- 60-79: Solid performance, clear growth opportunities
- 40-59: Underperforming, needs significant changes
- 0-39: Poor performance or very low data

IMPORTANT ANALYSIS RULES:
- If engagement rate < 1% of reach: flag as major issue (Facebook avg is 0.5-1%)
- If engagement rate > 3% of reach: strong performer
- If shares > 5% of reactions: excellent viral coefficient → highlight as key strength
- If comments < 2% of reactions: audience not inspired to respond → content/CTA issue
- If reach < 20% of followers: algorithm suppression likely → investigate content signals
- If organic reach rate (reach/impressions) < 60%: Facebook is re-showing to same people, audience fatigue
- Post timing: evening 6-10pm and weekday lunchtimes typically perform best
- Text-only posts with questions often get more comments than photo posts
- Posts with external links typically get lower reach (Facebook algorithm penalty)

Return only JSON, no markdown, no extra text.`;
}


export async function POST(req: NextRequest) {
  let post: PostAnalysisPayload;
  try {
    post = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!post.created_time) {
    return NextResponse.json({ error: 'Invalid post data.' }, { status: 400 });
  }

  try {
    const analysis = await callGemini<GeminiAnalysis>(
      SYSTEM_PROMPT,
      buildPrompt(post),
      { temperature: 0.25, maxOutputTokens: 4096 },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof GeminiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 500 });
  }
}
