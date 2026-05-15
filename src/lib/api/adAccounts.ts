import { graphFetch } from './client';
import type { AdAccount } from '../types';

interface AdAccountsResponse {
  data: AdAccount[];
  paging?: object;
}

export async function getAdAccounts(token: string): Promise<AdAccount[]> {
  const result = await graphFetch<AdAccountsResponse>(
    '/me/adaccounts',
    {
      fields: 'id,name,account_status,currency,amount_spent,balance,spend_cap,timezone_name,business',
      limit: '50',
    },
    token
  );
  return result.data ?? [];
}
