import { graphMutate } from './client';
import type { CampaignBuilderInput, CampaignCreationResult, CampaignDraft } from '@/lib/types/campaign-builder';

function accountPath(accountId: string) {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

function genderIds(genders: string[]) {
  if (genders.includes('all') || genders.length === 0) return undefined;
  const ids = genders.flatMap(gender => gender === 'male' ? [1] : gender === 'female' ? [2] : []);
  return ids.length ? Array.from(new Set(ids)) : undefined;
}

function placementParams(placements: string[]) {
  if (!placements.length || placements.includes('advantage_plus')) return {};
  const publishers = new Set<string>();
  const facebook = new Set<string>();
  const instagram = new Set<string>();
  for (const placement of placements) {
    if (placement === 'facebook_feed') { publishers.add('facebook'); facebook.add('feed'); }
    if (placement === 'instagram_feed') { publishers.add('instagram'); instagram.add('stream'); }
    if (placement === 'facebook_reels') { publishers.add('facebook'); facebook.add('facebook_reels'); }
    if (placement === 'instagram_reels') { publishers.add('instagram'); instagram.add('reels'); }
    if (placement === 'stories') { publishers.add('facebook'); publishers.add('instagram'); facebook.add('story'); instagram.add('story'); }
    if (placement === 'audience_network') publishers.add('audience_network');
  }
  return {
    ...(publishers.size ? { publisher_platforms: Array.from(publishers) } : {}),
    ...(facebook.size ? { facebook_positions: Array.from(facebook) } : {}),
    ...(instagram.size ? { instagram_positions: Array.from(instagram) } : {}),
  };
}

export class CampaignCreationError extends Error {
  constructor(message: string, public readonly partial: { campaignId?: string; adSetIds: string[]; adIds: string[] }) {
    super(message);
    this.name = 'CampaignCreationError';
  }
}

export async function createPausedCampaignFromDraft(
  accountId: string,
  input: CampaignBuilderInput,
  draft: CampaignDraft,
  token: string,
): Promise<CampaignCreationResult> {
  if (input.businessGoal === 'sales' && !input.pixelId.trim()) throw new Error('Sales campaigns require a Pixel ID before creation on Meta.');
  if (['leads', 'engagement'].includes(input.businessGoal) && !input.pageId.trim()) throw new Error('The selected objective requires a Page ID before creation on Meta.');

  const partial: { campaignId?: string; adSetIds: string[]; adIds: string[] } = { adSetIds: [], adIds: [] };
  try {
    const campaign = await graphMutate<{ id: string }>(`/${accountPath(accountId)}/campaigns`, {
      name: draft.campaign.name,
      objective: draft.campaign.objective,
      status: 'PAUSED',
      special_ad_categories: JSON.stringify(draft.campaign.specialAdCategories),
      is_adset_budget_sharing_enabled: 'false',
    }, token);
    partial.campaignId = campaign.id;

    const startTime = new Date(Date.now() + 10 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + draft.campaign.durationDays * 24 * 60 * 60 * 1000);
    const adSetIds = new Map<string, string>();
    for (const adSetDraft of draft.adSets) {
      const genders = genderIds(adSetDraft.targeting.genders);
      const targeting = {
        geo_locations: { countries: adSetDraft.targeting.countries },
        age_min: adSetDraft.targeting.ageMin,
        age_max: adSetDraft.targeting.ageMax,
        ...(genders ? { genders } : {}),
        ...placementParams(adSetDraft.placements),
      };
      const promotedObject = input.businessGoal === 'sales'
        ? { pixel_id: input.pixelId.trim(), custom_event_type: 'PURCHASE' }
        : ['leads', 'engagement'].includes(input.businessGoal)
          ? { page_id: input.pageId.trim() }
          : undefined;
      const adSet = await graphMutate<{ id: string }>(`/${accountPath(accountId)}/adsets`, {
        name: adSetDraft.name,
        campaign_id: campaign.id,
        lifetime_budget: adSetDraft.lifetimeBudgetRaw,
        billing_event: adSetDraft.billingEvent,
        optimization_goal: adSetDraft.optimizationGoal,
        bid_strategy: adSetDraft.bidStrategy,
        targeting: JSON.stringify(targeting),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'PAUSED',
        ...(promotedObject ? { promoted_object: JSON.stringify(promotedObject) } : {}),
      }, token);
      partial.adSetIds.push(adSet.id);
      adSetIds.set(adSetDraft.draftId, adSet.id);
    }

    const canCreateAds = Boolean(input.pageId.trim() && input.postId.trim());
    if (canCreateAds) {
      const cleanPostId = input.postId.includes('_') ? input.postId.split('_').pop()! : input.postId;
      for (const adDraft of draft.ads) {
        const adSetId = adSetIds.get(adDraft.adSetDraftId);
        if (!adSetId) continue;
        const ad = await graphMutate<{ id: string }>(`/${accountPath(accountId)}/ads`, {
          name: adDraft.name,
          adset_id: adSetId,
          creative: JSON.stringify({ object_story_id: `${input.pageId.trim()}_${cleanPostId}` }),
          status: 'PAUSED',
        }, token);
        partial.adIds.push(ad.id);
      }
    }
    return { campaignId: campaign.id, adSetIds: partial.adSetIds, adIds: partial.adIds, skippedAds: !canCreateAds, status: 'PAUSED' };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Meta could not create the campaign.';
    throw new CampaignCreationError(`${detail} Any entities already created remain paused.`, partial);
  }
}
