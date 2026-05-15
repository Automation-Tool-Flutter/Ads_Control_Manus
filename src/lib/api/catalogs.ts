import { graphFetch, graphMutate } from './client';
import type { Catalog, Product, PagedResult } from '../types';

interface CatalogsResponse {
  data: Catalog[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

interface ProductsResponse {
  data: Product[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

interface AccountWithCatalogsResponse {
  business?: {
    owned_product_catalogs?: CatalogsResponse;
  };
}

export async function getCatalogs(accountId: string, token: string): Promise<Catalog[]> {
  const result = await graphFetch<AccountWithCatalogsResponse>(
    `/${accountId}`,
    { fields: 'business{owned_product_catalogs.limit(50){id,name,product_count,vertical,feed_count,business}}' },
    token
  );
  return result.business?.owned_product_catalogs?.data ?? [];
}

export async function getCatalogProducts(
  catalogId: string,
  token: string,
  cursor?: string
): Promise<PagedResult<Product>> {
  const params: Record<string, string> = {
    fields: 'id,name,price,availability,image_url,url,description',
    limit: '50',
  };
  if (cursor) params.after = cursor;

  const result = await graphFetch<ProductsResponse>(
    `/${catalogId}/products`,
    params,
    token
  );
  return {
    data: result.data ?? [],
    nextCursor: result.paging?.next ? result.paging.cursors?.after : undefined,
  };
}

export async function updateProduct(
  productId: string,
  fields: Partial<Pick<Product, 'price' | 'availability'>>,
  token: string
): Promise<void> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) params[key] = String(value);
  }
  await graphMutate(`/${productId}`, params, token);
}
