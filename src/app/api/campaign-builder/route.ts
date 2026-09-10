import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import { amountToRawBudget } from '@/lib/utils';
import type { CampaignBuilderInput, CampaignDraft } from '@/lib/types/campaign-builder';

const GOAL_CONFIG = {
  sales: { objective: 'OUTCOME_SALES', optimizationGoal: 'OFFSITE_CONVERSIONS', billingEvent: 'IMPRESSIONS' },
  leads: { objective: 'OUTCOME_LEADS', optimizationGoal: 'LEAD_GENERATION', billingEvent: 'IMPRESSIONS' },
  traffic: { objective: 'OUTCOME_TRAFFIC', optimizationGoal: 'LINK_CLICKS', billingEvent: 'IMPRESSIONS' },
  engagement: { objective: 'OUTCOME_ENGAGEMENT', optimizationGoal: 'POST_ENGAGEMENT', billingEvent: 'IMPRESSIONS' },
  video: { objective: 'OUTCOME_ENGAGEMENT', optimizationGoal: 'THRUPLAY', billingEvent: 'IMPRESSIONS' },
  awareness: { objective: 'OUTCOME_AWARENESS', optimizationGoal: 'REACH', billingEvent: 'IMPRESSIONS' },
} as const;

const SYSTEM_PROMPT = `You are a senior Meta Ads campaign planner. Create a practical campaign draft from the supplied brief. Use only supplied business facts and never claim forecast performance. Return concise English copy. Campaign, ad set and ad names must be operationally useful. Interests are human-readable research hypotheses only, never platform IDs. Budget shares must be positive integers and sum to exactly 100.`;

const SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    campaignName: { type: 'string' },
    campaignRationale: { type: 'string' },
    adSets: { type: 'array', minItems: 1, maxItems: 5, items: {
      type: 'object', additionalProperties: false,
      properties: {
        draftId: { type: 'string' }, name: { type: 'string' },
        budgetSharePercent: { type: 'integer', minimum: 1, maximum: 100 },
        ageMin: { type: 'integer', minimum: 18, maximum: 65 },
        ageMax: { type: 'integer', minimum: 18, maximum: 65 },
        genders: { type: 'array', items: { type: 'string', enum: ['all', 'male', 'female'] } },
        interests: { type: 'array', items: { type: 'string' } },
        audienceType: { type: 'string' }, placements: { type: 'array', items: { type: 'string', enum: ['advantage_plus', 'facebook_feed', 'instagram_feed', 'facebook_reels', 'instagram_reels', 'stories', 'audience_network'] } },
        rationale: { type: 'string' },
      },
      required: ['draftId', 'name', 'budgetSharePercent', 'ageMin', 'ageMax', 'genders', 'interests', 'audienceType', 'placements', 'rationale'],
    }},
    ads: { type: 'array', minItems: 1, maxItems: 10, items: {
      type: 'object', additionalProperties: false,
      properties: {
        draftId: { type: 'string' }, adSetDraftId: { type: 'string' }, name: { type: 'string' },
        headline: { type: 'string' }, primaryText: { type: 'string' },
        cta: { type: 'string' }, format: { type: 'string' }, creativeBrief: { type: 'string' },
      },
      required: ['draftId', 'adSetDraftId', 'name', 'headline', 'primaryText', 'cta', 'format', 'creativeBrief'],
    }},
    testPlan: { type: 'array', minItems: 2, maxItems: 6, items: {
      type: 'object', additionalProperties: false,
      properties: { day: { type: 'integer', minimum: 1 }, action: { type: 'string' }, successMetric: { type: 'string' }, decisionRule: { type: 'string' } },
      required: ['day', 'action', 'successMetric', 'decisionRule'],
    }},
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'confidence', 'campaignName', 'campaignRationale', 'adSets', 'ads', 'testPlan', 'risks'],
};

interface AIResult {
  summary: string; confidence: number; campaignName: string; campaignRationale: string;
  adSets: Array<{ draftId: string; name: string; budgetSharePercent: number; ageMin: number; ageMax: number; genders: string[]; interests: string[]; audienceType: string; placements: string[]; rationale: string }>;
  ads: CampaignDraft['ads']; testPlan: CampaignDraft['testPlan']; risks: string[];
}

function distributeBudget(total: number, shares: number[]) {
  const safeShares = shares.map(value => Math.max(1, Math.round(value)));
  const shareTotal = safeShares.reduce((sum, value) => sum + value, 0);
  const values = safeShares.map(value => Math.floor(total * value / shareTotal));
  let remainder = total - values.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % values.length) { values[index] += 1; remainder -= 1; }
  const normalizedShares = safeShares.map(value => Math.floor(100 * value / shareTotal));
  let shareRemainder = 100 - normalizedShares.reduce((sum, value) => sum + value, 0);
  for (let index = 0; shareRemainder > 0; index = (index + 1) % normalizedShares.length) { normalizedShares[index] += 1; shareRemainder -= 1; }
  return { values, normalizedShares };
}

export async function POST(request: NextRequest) {
  let input: CampaignBuilderInput;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const goal = GOAL_CONFIG[input.businessGoal];
  const budgetRaw = Number(amountToRawBudget(input.totalBudget, input.currency));
  if (!goal) return NextResponse.json({ error: 'Invalid business objective.' }, { status: 400 });
  if ((!input.productName?.trim() && !input.catalogId?.trim()) || !input.customerPersona?.trim()) return NextResponse.json({ error: 'Select a catalog or enter a product, and describe the customer profile.' }, { status: 400 });
  if (!Number.isInteger(budgetRaw) || budgetRaw <= 0) return NextResponse.json({ error: 'Invalid total budget.' }, { status: 400 });
  if (!Array.isArray(input.marketCountries) || input.marketCountries.length === 0) return NextResponse.json({ error: 'Enter at least one country code.' }, { status: 400 });
  if (input.marketCountries.some(country => !/^[A-Za-z]{2}$/.test(country))) return NextResponse.json({ error: 'Country codes must contain exactly two letters, such as VN or US.' }, { status: 400 });
  if (!Number.isInteger(input.durationDays) || input.durationDays < 2 || input.durationDays > 180) return NextResponse.json({ error: 'Duration must be between 2 and 180 days.' }, { status: 400 });

  try {
    const ai = await callOpenAI<AIResult>(SYSTEM_PROMPT, `Build a campaign plan using the following data:\n${JSON.stringify({ ...input, accountId: undefined, pageId: input.pageId ? 'available' : 'missing', postId: input.postId ? 'available' : 'missing', pixelId: input.pixelId ? 'available' : 'missing', requiredAdSets: input.numberOfAdSets, fixedObjective: goal.objective, fixedOptimizationGoal: goal.optimizationGoal }, null, 2)}\nEvery ad set needs at least one ad concept. Use the exact draftId values to link ads to ad sets.`, {
      temperature: 0.35, maxOutputTokens: 6000, schema: { name: 'campaign_builder_draft', value: SCHEMA },
    });
    const selected = ai.adSets.slice(0, Math.max(1, Math.min(5, input.numberOfAdSets)));
    if (!selected.length) throw new Error('AI did not generate a valid ad set.');
    const allocation = distributeBudget(budgetRaw, selected.map(item => item.budgetSharePercent));
    const validAdSetIds = new Set(selected.map(item => item.draftId));
    const preflight: CampaignDraft['preflightChecks'] = [
      { label: 'Meta access token', status: 'pass', detail: 'Your current Meta session will be used for creation.' },
      { label: 'Conversion tracking', status: input.businessGoal === 'sales' && !input.pixelId ? 'required' : 'pass', detail: input.businessGoal === 'sales' ? (input.pixelId ? 'Pixel ID provided.' : 'Sales campaigns require a Pixel ID for conversion ad sets.') : 'Not required for the selected objective.' },
      { label: 'Page identity', status: ['leads', 'engagement'].includes(input.businessGoal) && !input.pageId ? 'required' : input.pageId ? 'pass' : 'warning', detail: input.pageId ? 'Page ID provided.' : 'Add a Page ID to create ads or use an objective that requires a Page.' },
      { label: 'Existing Page post', status: input.pageId && input.postId ? 'pass' : 'warning', detail: input.pageId && input.postId ? 'Paused ads can be created from this post.' : 'Missing Page or Post ID: only a paused campaign and ad sets will be created.' },
      { label: 'Interest IDs', status: selected.some(item => item.interests.length) ? 'warning' : 'pass', detail: 'AI interest suggestions are research guidance. Creation only uses location, age, and gender to avoid invalid targeting IDs.' },
    ];
    const draft: CampaignDraft = {
      summary: ai.summary, confidence: ai.confidence,
      campaign: { name: ai.campaignName, objective: goal.objective, totalBudgetRaw: String(budgetRaw), durationDays: input.durationDays, specialAdCategories: [], rationale: ai.campaignRationale },
      adSets: selected.map((item, index) => ({
        draftId: item.draftId, name: item.name, budgetSharePercent: allocation.normalizedShares[index], lifetimeBudgetRaw: String(allocation.values[index]),
        optimizationGoal: goal.optimizationGoal, billingEvent: goal.billingEvent, bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: { countries: input.marketCountries.map(country => country.toUpperCase()), ageMin: Math.min(item.ageMin, item.ageMax), ageMax: Math.max(item.ageMin, item.ageMax), genders: item.genders, interests: item.interests, audienceType: item.audienceType },
        placements: item.placements, rationale: item.rationale,
      })),
      ads: ai.ads.filter(ad => validAdSetIds.has(ad.adSetDraftId)), testPlan: ai.testPlan, risks: ai.risks, preflightChecks: preflight,
    };
    return NextResponse.json(draft);
  } catch (error) {
    if (error instanceof OpenAIError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create a campaign draft.' }, { status: 500 });
  }
}
