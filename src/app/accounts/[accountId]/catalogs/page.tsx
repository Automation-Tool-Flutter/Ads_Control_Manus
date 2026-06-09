'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogs } from '@/hooks/useCatalogs';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ErrorState } from '@/components/ui/ErrorState';
import type { Catalog } from '@/lib/types';

const VERTICAL_LABELS: Record<string, string> = {
  commerce: 'Commerce',
  destinations: 'Destinations',
  flights: 'Flights',
  home_listings: 'Real estate',
  hotels: 'Hotels',
  vehicles: 'Vehicles',
};

function CatalogCard({ catalog, accountId }: { catalog: Catalog; accountId: string }) {
  return (
    <Link
      href={`/accounts/${accountId}/catalogs/${catalog.id}`}
      className="meta-item meta-item-compact meta-compact-pad group block p-4"
    >
      <div className="flex items-start gap-3">
        <div className="meta-compact-avatar flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="meta-compact-title truncate font-bold text-text-primary">{catalog.name}</p>
          {catalog.business?.name && (
            <div className="meta-compact-hide mt-1 inline-flex max-w-full items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-xs font-bold text-accent">
              <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              <span className="truncate">{catalog.business.name}</span>
            </div>
          )}
          <p className="mt-1 truncate font-mono text-[10px] text-text-muted">{catalog.id}</p>
        </div>
        <svg className="h-4 w-4 flex-shrink-0 text-text-muted transition-colors group-hover:text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {catalog.vertical && (
          <span className="meta-metric">
            <span className="block text-[10px] font-bold uppercase text-text-muted">Vertical</span>
            <span className="mt-1 block truncate text-sm font-black text-text-primary">{VERTICAL_LABELS[catalog.vertical] ?? catalog.vertical}</span>
          </span>
        )}
        {catalog.product_count !== undefined && (
          <span className="meta-metric">
            <span className="block text-[10px] font-bold uppercase text-text-muted">Products</span>
            <span className="mt-1 block text-sm font-black tabular-nums text-text-primary">{catalog.product_count.toLocaleString()}</span>
          </span>
        )}
        {catalog.feed_count !== undefined && catalog.feed_count > 0 && (
          <span className="meta-metric">
            <span className="block text-[10px] font-bold uppercase text-text-muted">Feeds</span>
            <span className="mt-1 block text-sm font-black tabular-nums text-text-primary">{catalog.feed_count}</span>
          </span>
        )}
      </div>
    </Link>
  );
}

export default function CatalogsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const { accountId } = params;

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/login');
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useCatalogs(accountId, auth.token);

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <div className="mb-5">
        <Breadcrumb
          items={[
            { label: 'Accounts', href: '/accounts' },
            { label: accountId, href: `/accounts/${accountId}` },
            { label: 'Product Catalogs' },
          ]}
        />
        <div className="flex items-center gap-2.5 mt-3">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Product Catalogs</h1>
          {state.status === 'success' && (
            <span className="bg-accent/15 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
              {state.data.length}
            </span>
          )}
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="meta-item p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/8" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/8 rounded w-3/5" />
                  <div className="h-3 bg-white/5 rounded w-2/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && <ErrorState message={state.error} onRetry={retry} />}

      {state.status === 'success' && state.data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">This account has no product catalogs.</p>
        </div>
      )}

      {state.status === 'success' && state.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {state.data.map(catalog => (
            <CatalogCard key={catalog.id} catalog={catalog} accountId={accountId} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
