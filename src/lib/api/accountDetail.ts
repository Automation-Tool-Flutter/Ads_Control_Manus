import { graphFetch } from './client';
import type { AccountDetail } from '../types';

export async function getAccountDetail(accountId: string, token: string): Promise<AccountDetail> {
  return graphFetch<AccountDetail>(
    `/${accountId}`,
    {
      fields: 'id,name,account_status,currency,amount_spent,balance,spend_cap,timezone_name,business{id,name}',
    },
    token
  );
}
