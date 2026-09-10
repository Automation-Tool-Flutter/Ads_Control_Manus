'use client';

import { useCallback, useState } from 'react';
import { createPausedCampaignFromDraft, CampaignCreationError } from '@/lib/api/campaignBuilder';
import type { CampaignBuilderInput, CampaignBuilderState, CampaignCreationResult, CampaignDraft } from '@/lib/types/campaign-builder';

export type CampaignCreateState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'success'; result: CampaignCreationResult }
  | { status: 'error'; error: string; partial?: { campaignId?: string; adSetIds: string[]; adIds: string[] } };

export function useCampaignBuilder(accountId: string, token: string | null) {
  const [state, setState] = useState<CampaignBuilderState>({ status: 'idle' });
  const [createState, setCreateState] = useState<CampaignCreateState>({ status: 'idle' });

  const generate = useCallback(async (input: CampaignBuilderInput) => {
    setState({ status: 'generating' }); setCreateState({ status: 'idle' });
    try {
      const response = await fetch('/api/campaign-builder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(70_000) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Unable to generate a campaign draft.');
      setState({ status: 'success', draft: payload as CampaignDraft });
    } catch (error) { setState({ status: 'error', error: error instanceof Error ? error.message : 'Unable to generate a campaign draft.' }); }
  }, []);

  const create = useCallback(async (input: CampaignBuilderInput, draft: CampaignDraft) => {
    if (!token) return;
    setCreateState({ status: 'creating' });
    try {
      const result = await createPausedCampaignFromDraft(accountId, input, draft, token);
      setCreateState({ status: 'success', result });
    } catch (error) {
      setCreateState(error instanceof CampaignCreationError
        ? { status: 'error', error: error.message, partial: error.partial }
        : { status: 'error', error: error instanceof Error ? error.message : 'Unable to create the campaign.' });
    }
  }, [accountId, token]);

  const reset = useCallback(() => { setState({ status: 'idle' }); setCreateState({ status: 'idle' }); }, []);
  return { state, createState, generate, create, reset };
}
