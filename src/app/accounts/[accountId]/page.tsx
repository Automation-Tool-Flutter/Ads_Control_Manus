'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { PageContainer } from '@/components/layout/PageContainer';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InsightsPanel } from '@/components/ui/InsightsPanel';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, getAccountStatus } from '@/lib/utils';

export default function AccountDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;
  const searchParams = useSearchParams();
  const accountName = searchParams.get('name') ?? accountId;

  useEffect(() => {
    if (!auth.isLoading && !auth.token) {
      router.replace('/login');
    }
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useAccountDetail(accountId, auth.token);

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[
            { label: 'Accounts', href: '/accounts' },
            { label: state.status === 'success' ? state.data.name : accountName },
        ]}
        eyebrow="Meta ads account"
        title={state.status === 'success' ? state.data.name : 'Account Details'}
        description="Inspect account health, spend controls, delivery entry points, and GPT optimization from one operating surface."
        badge="Meta + GPT"
        stats={state.status === 'success' ? [
          { label: 'spent', value: formatCurrency(state.data.amount_spent, state.data.currency), tone: 'blue' },
          { label: 'balance', value: formatCurrency(state.data.balance, state.data.currency), tone: 'neutral' },
          { label: 'cap', value: state.data.spend_cap ? formatCurrency(state.data.spend_cap, state.data.currency) : 'Open', tone: 'green' },
        ] : []}
      />

      {state.status === 'loading' && <LoadingState message="Loading account info..." />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} />
      )}

      {state.status === 'success' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
          {/* Info card */}
          <div className="meta-item p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-text-primary truncate">{state.data.name}</h2>
                <code className="font-mono text-xs text-text-muted block truncate">{state.data.id}</code>
              </div>
              <StatusBadge
                label={getAccountStatus(state.data.account_status).label}
                color={getAccountStatus(state.data.account_status).color}
              />
            </div>

            {/* Key metrics row */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="meta-metric">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Spent</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {formatCurrency(state.data.amount_spent, state.data.currency)}
                </p>
              </div>
              <div className="meta-metric">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Balance</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {formatCurrency(state.data.balance, state.data.currency)}
                </p>
              </div>
              <div className="meta-metric">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Spend Cap</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {state.data.spend_cap ? formatCurrency(state.data.spend_cap, state.data.currency) : '—'}
                </p>
              </div>
            </div>

            {/* Secondary info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
              <span><span className="text-text-muted">Currency:</span> {state.data.currency}</span>
              <span className="truncate max-w-full"><span className="text-text-muted">Timezone:</span> {state.data.timezone_name}</span>
              {state.data.business && (
                <span className="truncate max-w-full"><span className="text-text-muted">Business:</span> {state.data.business.name}</span>
              )}
            </div>
          </div>

          {/* Insights */}
          <div className="meta-item p-4">
            <InsightsPanel
              objectId={accountId}
              level="account"
              currency={state.data.currency}
              token={auth.token}
            />
          </div>
          </div>

          <aside className="space-y-3">
          {/* AI Optimize CTA */}
          <Link
            href={`/accounts/${accountId}/optimize`}
            className="meta-item flex items-center justify-between gap-3 border-accent/40 bg-accent/10 p-5 transition-colors hover:bg-accent/15 group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-text-primary">GPT Optimization</p>
                <span className="bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded-md">AI</span>
              </div>
              <p className="text-text-secondary text-sm">Get AI-powered optimization insights across 5 dimensions</p>
            </div>
            <svg
              className="w-5 h-5 text-accent transition-colors flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          {/* Link to campaigns */}
          <Link
            href={`/accounts/${accountId}/campaigns${state.status === 'success' ? `?accountName=${encodeURIComponent(state.data.name)}&currency=${state.data.currency}` : ''}`}
            className="meta-item flex items-center justify-between gap-3 p-5 transition-colors group"
          >
            <div>
              <p className="font-semibold text-text-primary">Campaigns</p>
              <p className="text-text-secondary text-sm mt-0.5">View all campaigns for this account</p>
            </div>
            <svg
              className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          {/* Link to product catalogs */}
          <Link
            href={`/accounts/${accountId}/catalogs`}
            className="meta-item flex items-center justify-between gap-3 p-5 transition-colors group"
          >
            <div>
              <p className="font-semibold text-text-primary">Product Catalogs</p>
              <p className="text-text-secondary text-sm mt-0.5">Manage product catalogs for dynamic ads</p>
            </div>
            <svg
              className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          </aside>
        </div>
      )}
    </PageContainer>
  );
}
