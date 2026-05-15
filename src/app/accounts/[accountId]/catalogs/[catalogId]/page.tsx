'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ErrorState } from '@/components/ui/ErrorState';
import { updateProduct } from '@/lib/api/catalogs';
import { useToast } from '@/components/ui/Toaster';
import type { Product } from '@/lib/types';

function AvailabilityBadge({ availability }: { availability: string | undefined }) {
  const isInStock = availability === 'in stock' || availability === 'IN_STOCK';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      isInStock
        ? 'bg-status-green/15 text-status-green'
        : 'bg-status-red/15 text-status-red'
    }`}>
      {isInStock ? 'In stock' : availability ?? 'Unknown'}
    </span>
  );
}

function ProductCard({
  product,
  onUpdateAvailability,
  token,
}: {
  product: Product;
  onUpdateAvailability: (id: string, availability: string) => Promise<void>;
  token: string;
}) {
  const [toggling, setToggling] = useState(false);
  const isInStock = product.availability === 'in stock' || product.availability === 'IN_STOCK';

  async function toggleAvailability() {
    setToggling(true);
    try {
      const next = isInStock ? 'out of stock' : 'in stock';
      await onUpdateAvailability(product.id, next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="glass-card gradient-border-card rounded-xl overflow-hidden">
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="aspect-square w-full bg-bg-secondary flex items-center justify-center">
          <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium text-text-primary line-clamp-2 mb-1">{product.name}</p>
        {product.price && (
          <p className="text-base font-bold text-text-primary mb-2">{product.price}</p>
        )}
        <div className="flex items-center justify-between">
          <AvailabilityBadge availability={product.availability} />
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isInStock ? 'bg-status-green' : 'bg-white/20'
            } ${toggling ? 'opacity-50' : ''}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              isInStock ? 'translate-x-4' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CatalogDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string; catalogId: string }>();
  const { accountId, catalogId } = params;
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [availFilter, setAvailFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
  }, [auth.isLoading, auth.token, router]);

  const { state, retry, loadMore, hasMore, loadingMore } = useCatalogProducts(catalogId, auth.token);

  // Optimistic update products list
  const [productOverrides, setProductOverrides] = useState<Record<string, Partial<Product>>>({});

  const handleUpdateAvailability = useCallback(async (productId: string, availability: string) => {
    // Optimistic update
    setProductOverrides(prev => ({ ...prev, [productId]: { availability } }));
    try {
      await updateProduct(productId, { availability }, auth.token!);
      toast('Availability updated', 'success');
    } catch (err) {
      // Rollback
      setProductOverrides(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  }, [auth.token, toast]);

  const allProducts = state.status === 'success'
    ? state.data.map(p => ({ ...p, ...productOverrides[p.id] }))
    : [];

  const filtered = allProducts
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => {
      if (availFilter === 'in_stock') return p.availability === 'in stock' || p.availability === 'IN_STOCK';
      if (availFilter === 'out_of_stock') return p.availability !== 'in stock' && p.availability !== 'IN_STOCK';
      return true;
    });

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <div className="mb-5">
        <Breadcrumb
          items={[
            { label: 'Accounts', href: '/accounts' },
            { label: accountId, href: `/accounts/${accountId}` },
            { label: 'Catalogs', href: `/accounts/${accountId}/catalogs` },
            { label: catalogId },
          ]}
        />
        <div className="flex items-center gap-2.5 mt-3">
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Products</h1>
          {state.status === 'success' && (
            <span className="bg-accent/15 text-accent text-xs font-semibold px-2 py-0.5 rounded-full">
              {state.data.length}
            </span>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      {state.status === 'success' && state.data.length > 0 && (
        <div className="sticky top-16 z-10 bg-bg-primary py-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-4 flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products..."
            className="flex-1 px-3 py-2 text-sm bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2">
            {(['all', 'in_stock', 'out_of_stock'] as const).map(f => (
              <button
                key={f}
                onClick={() => setAvailFilter(f)}
                className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                  availFilter === f
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:text-text-secondary'
                }`}
              >
                {f === 'all' ? 'All' : f === 'in_stock' ? 'In stock' : 'Out of stock'}
              </button>
            ))}
          </div>
        </div>
      )}

      {state.status === 'loading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl animate-pulse">
              <div className="aspect-square bg-white/8" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/8 rounded w-4/5" />
                <div className="h-3 bg-white/5 rounded w-2/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && <ErrorState message={state.error} onRetry={retry} />}

      {state.status === 'success' && filtered.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-12">
          {search ? 'No products match your search' : 'This catalog has no products yet'}
        </p>
      )}

      {state.status === 'success' && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onUpdateAvailability={handleUpdateAvailability}
                token={auth.token ?? ''}
              />
            ))}
          </div>
          {hasMore && !search && availFilter === 'all' && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 w-full py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-white/[0.03] disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
          <p className="mt-4 text-text-muted text-xs text-right">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p>
        </>
      )}
    </PageContainer>
  );
}
