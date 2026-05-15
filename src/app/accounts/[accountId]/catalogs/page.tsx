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
      className="flex items-center gap-3 glass-card gradient-border-card rounded-2xl p-4 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-primary truncate">{catalog.name}</p>
        {catalog.business?.name && (
          <div className="flex items-center gap-1 mt-0.5">
            <svg className="w-3 h-3 text-accent/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <p className="text-xs text-accent/80 font-medium truncate">{catalog.business.name}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-text-muted">
          {catalog.vertical && (
            <span>{VERTICAL_LABELS[catalog.vertical] ?? catalog.vertical}</span>
          )}
          {catalog.product_count !== undefined && (
            <span>{catalog.product_count.toLocaleString()} products</span>
          )}
          {catalog.feed_count !== undefined && catalog.feed_count > 0 && (
            <span>{catalog.feed_count} {catalog.feed_count === 1 ? 'feed' : 'feeds'}</span>
          )}
        </div>
        <p className="font-mono text-[10px] text-text-muted/60 mt-1 truncate">{catalog.id}</p>
      </div>
      <svg className="w-4 h-4 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

export default function CatalogsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const { accountId } = params;

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
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
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/8" />
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
        <div className="space-y-3">
          {state.data.map(catalog => (
            <CatalogCard key={catalog.id} catalog={catalog} accountId={accountId} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
