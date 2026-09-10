'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { dateFilterLabel } from '@/lib/utils';
import type { DatePreset, DateRange } from '@/lib/types';
import type { AIViewContext } from '@/lib/ai-view-context';
let published: AIViewContext | null = null;
const EVENT = 'ai-view-context';
export function usePublishAIView(dateFilter: DatePreset | DateRange, selectedIds?: Set<string>, focusedAdId?: string) {
  const pathname = usePathname();
  const signature = JSON.stringify([dateFilter, Array.from(selectedIds ?? []).sort(), focusedAdId]);
  useEffect(() => {
    const value: AIViewContext = { pathname, dateLabel: dateFilterLabel(dateFilter), selectedIds: Array.from(selectedIds ?? []).slice(0,50) };
    published = value; window.dispatchEvent(new Event(EVENT));
    return () => { if (published === value) { published = null; window.dispatchEvent(new Event(EVENT)); } };
    // Compare values, not the identity of a date range or selection Set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, signature]);
}
export function useAIViewContext(): AIViewContext {
  const pathname = usePathname();
  const [context, setContext] = useState<AIViewContext | null>(null);
  useEffect(() => {
    const update = () => setContext({ pathname, selectedIds: [], ...(published?.pathname === pathname ? published : {}), focusedAdId: new URLSearchParams(window.location.search).get('adId') ?? undefined });
    update(); window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, [pathname]);
  return context?.pathname === pathname ? context : { pathname, selectedIds: [] };
}
