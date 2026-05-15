import { graphMutate } from './client';

export async function updateCampaignStatus(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED',
  token: string
): Promise<void> {
  await graphMutate(`/${campaignId}`, { status }, token);
}

export async function updateCampaignBudget(
  campaignId: string,
  dailyBudget: string,
  token: string
): Promise<void> {
  await graphMutate(`/${campaignId}`, { daily_budget: dailyBudget }, token);
}

export async function updateAdSetStatus(
  adsetId: string,
  status: 'ACTIVE' | 'PAUSED',
  token: string
): Promise<void> {
  await graphMutate(`/${adsetId}`, { status }, token);
}

export async function updateAdStatus(
  adId: string,
  status: 'ACTIVE' | 'PAUSED',
  token: string
): Promise<void> {
  await graphMutate(`/${adId}`, { status }, token);
}
