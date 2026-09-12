import type { AdsChatSnapshot } from './types/ads-chat';

/** Only advertise destinations supported by both the current snapshot and app routes. */
export function getChatEntityHref(snapshot: AdsChatSnapshot | null, entityId: string, entityType?: string): string | null {
  if (!snapshot || !entityId || !snapshot.accountId) return null;
  const entity = [...snapshot.campaigns, ...snapshot.adsets, ...snapshot.ads]
    .find(item => item.id === entityId && (!entityType || item.entityType === entityType));
  if (!entity?.campaignId || !entity.href) return null;
  const campaign = `/accounts/${encodeURIComponent(snapshot.accountId)}/campaigns/${encodeURIComponent(entity.campaignId)}`;
  let destination: string;
  if (entity.entityType === 'campaign') {
    if (entity.id !== entity.campaignId) return null;
    destination = campaign;
  } else if (entity.entityType === 'adset') {
    destination = `${campaign}/adsets/${encodeURIComponent(entity.id)}`;
  } else if (entity.entityType === 'ad' && entity.adsetId) {
    destination = `${campaign}/adsets/${encodeURIComponent(entity.adsetId)}?adId=${encodeURIComponent(entity.id)}`;
  } else return null;
  return entity.href === destination ? destination : null;
}
