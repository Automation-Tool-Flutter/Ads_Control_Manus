import type { AdsChatSnapshot } from './types/ads-chat';
export interface AIViewContext { pathname: string; selectedIds: string[]; dateLabel?: string; focusedAdId?: string }
export function resolveViewContext(snapshot: AdsChatSnapshot, context?: AIViewContext) {
  if (!context || typeof context.pathname !== 'string') return null;
  const segments = context.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'accounts' || segments[1] !== snapshot.accountId) return null;
  const focusedId = context.focusedAdId || (segments[4] === 'adsets' && segments[5] ? segments[5] : segments[2] === 'campaigns' ? segments[3] : undefined);
  const ids = Array.isArray(context.selectedIds) && context.selectedIds.length ? context.selectedIds.filter(id => typeof id === 'string').slice(0, 50) : focusedId ? [focusedId] : [];
  const entities = [...snapshot.campaigns, ...snapshot.adsets, ...snapshot.ads];
  return {
    entities: entities.filter(entity => ids.includes(entity.id)).map(entity => ({ id: entity.id, name: entity.name, type: entity.entityType })),
    missingIds: ids.filter(id => !entities.some(entity => entity.id === id)),
    pageDateLabel: typeof context.dateLabel === 'string' ? context.dateLabel.slice(0, 100) : null,
    actualDataPeriod: snapshot.period,
    note: 'Context identifies entities only. Use actualDataPeriod for metrics; do not treat the page filter as the loaded data period. Explicitly report missing entities rather than substituting others.',
  };
}
