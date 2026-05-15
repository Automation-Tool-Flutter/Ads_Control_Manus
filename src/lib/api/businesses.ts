import { graphFetch } from './client';
import type { Business, BusinessAdAccount, BusinessPage, BusinessInstagramAccount, BusinessUser, Catalog, BusinessDetailData, RawAdAccount } from '../types';

interface ListResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

const BUSINESS_FIELDS = [
  'id,name,verification_status,created_time,profile_picture_uri,timezone_id',
  'primary_page{id,name,category}',
  'owned_ad_accounts.limit(50){id,name,account_status,currency,insights.date_preset(maximum){spend}}',
  'client_ad_accounts.limit(50){id,name,account_status,currency,insights.date_preset(maximum){spend}}',
  'business_users.limit(100){id,name,email,role,title,created_time}',
  'owned_pages.limit(50){id,name,category,tasks}',
  'client_pages.limit(50){id,name,category,tasks}',
  'owned_instagram_accounts.limit(25){id,name,username,profile_picture_url}',
  'owned_product_catalogs.limit(50){id,name,product_count,vertical}',
].join(',');

/** Follow paging.next for a nested connection and collect all items */
async function fetchRemainingPages<T>(nextUrl: string, token: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | undefined = nextUrl;
  while (url) {
    const parsed: URL = new URL(url);
    const path: string = parsed.pathname.replace(/^\/v\d+\.\d+/, '');
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((v: string, k: string) => { if (k !== 'access_token') params[k] = v; });
    const page: ListResponse<T> = await graphFetch<ListResponse<T>>(path, params, token);
    items.push(...(page.data ?? []));
    url = page.paging?.next;
  }
  return items;
}

/** For each nested connection in a business that has paging.next, fetch remaining pages */
async function expandBusinessPages(biz: Business, token: string): Promise<Business> {
  const expansions = await Promise.all([
    biz.owned_ad_accounts?.paging?.next
      ? fetchRemainingPages<RawAdAccount>(biz.owned_ad_accounts.paging.next, token)
      : Promise.resolve([] as RawAdAccount[]),
    biz.client_ad_accounts?.paging?.next
      ? fetchRemainingPages<RawAdAccount>(biz.client_ad_accounts.paging.next, token)
      : Promise.resolve([] as RawAdAccount[]),
    biz.business_users?.paging?.next
      ? fetchRemainingPages<BusinessUser>(biz.business_users.paging.next, token)
      : Promise.resolve([] as BusinessUser[]),
    biz.owned_pages?.paging?.next
      ? fetchRemainingPages<{ id: string; name: string; category?: string; tasks?: string[] }>(biz.owned_pages.paging.next, token)
      : Promise.resolve([] as Array<{ id: string; name: string; category?: string; tasks?: string[] }>),
    biz.client_pages?.paging?.next
      ? fetchRemainingPages<{ id: string; name: string; category?: string; tasks?: string[] }>(biz.client_pages.paging.next, token)
      : Promise.resolve([] as Array<{ id: string; name: string; category?: string; tasks?: string[] }>),
    biz.owned_instagram_accounts?.paging?.next
      ? fetchRemainingPages<BusinessInstagramAccount>(biz.owned_instagram_accounts.paging.next, token)
      : Promise.resolve([] as BusinessInstagramAccount[]),
    biz.owned_product_catalogs?.paging?.next
      ? fetchRemainingPages<Catalog>(biz.owned_product_catalogs.paging.next, token)
      : Promise.resolve([] as Catalog[]),
  ]);

  const [moreOwned, moreClient, moreUsers, moreOwnedPages, moreClientPages, moreInstagram, moreCatalogs] = expansions;

  return {
    ...biz,
    owned_ad_accounts: biz.owned_ad_accounts
      ? { data: [...biz.owned_ad_accounts.data, ...moreOwned] }
      : undefined,
    client_ad_accounts: biz.client_ad_accounts
      ? { data: [...biz.client_ad_accounts.data, ...moreClient] }
      : undefined,
    business_users: biz.business_users
      ? { data: [...biz.business_users.data, ...moreUsers] }
      : undefined,
    owned_pages: biz.owned_pages
      ? { data: [...biz.owned_pages.data, ...moreOwnedPages] }
      : undefined,
    client_pages: biz.client_pages
      ? { data: [...biz.client_pages.data, ...moreClientPages] }
      : undefined,
    owned_instagram_accounts: biz.owned_instagram_accounts
      ? { data: [...biz.owned_instagram_accounts.data, ...moreInstagram] }
      : undefined,
    owned_product_catalogs: biz.owned_product_catalogs
      ? { data: [...biz.owned_product_catalogs.data, ...moreCatalogs] }
      : undefined,
  };
}

export async function getBusinesses(token: string): Promise<Business[]> {
  const result = await graphFetch<ListResponse<Business>>(
    '/me/businesses',
    { fields: BUSINESS_FIELDS },
    token
  );
  const businesses = result.data ?? [];

  // Expand any nested connections that have more pages
  return Promise.all(businesses.map(biz => expandBusinessPages(biz, token)));
}

export function parseBusinessDetail(biz: Business): BusinessDetailData {
  const ownedAccounts: BusinessAdAccount[] = (biz.owned_ad_accounts?.data ?? []).map(a => ({
    id: a.id,
    name: a.name,
    account_status: a.account_status,
    currency: a.currency,
    ownership: 'owned' as const,
    spend: a.insights?.data?.[0]?.spend,
  }));
  const clientAccounts: BusinessAdAccount[] = (biz.client_ad_accounts?.data ?? []).map(a => ({
    id: a.id,
    name: a.name,
    account_status: a.account_status,
    currency: a.currency,
    ownership: 'client' as const,
    spend: a.insights?.data?.[0]?.spend,
  }));
  const ownedPages: BusinessPage[] = (biz.owned_pages?.data ?? []).map(p => ({ ...p, ownership: 'owned' as const }));
  const clientPages: BusinessPage[] = (biz.client_pages?.data ?? []).map(p => ({ ...p, ownership: 'client' as const }));
  const instagramAccounts: BusinessInstagramAccount[] = biz.owned_instagram_accounts?.data ?? [];
  const catalogs: Catalog[] = biz.owned_product_catalogs?.data ?? [];
  const users: BusinessUser[] = biz.business_users?.data ?? [];

  return {
    detail: biz,
    adAccounts: [...ownedAccounts, ...clientAccounts],
    pages: [...ownedPages, ...clientPages],
    instagramAccounts,
    catalogs,
    users,
  };
}
