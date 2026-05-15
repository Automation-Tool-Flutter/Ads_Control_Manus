'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailInfoGrid } from '@/components/ui/DetailInfoGrid';
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
      router.replace('/');
    }
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useAccountDetail(accountId, auth.token);

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Accounts', href: '/accounts' },
            { label: state.status === 'success' ? state.data.name : accountName },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">
          Account Details
        </h1>
      </div>

      {state.status === 'loading' && <LoadingState message="Loading account info..." />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} />
      )}

      {state.status === 'success' && (
        <div className="space-y-6">
          {/* Info card */}
          <div className="glass-card gradient-border-card rounded-2xl p-4">
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
              <div className="bg-bg-secondary rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Spent</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {formatCurrency(state.data.amount_spent, state.data.currency)}
                </p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Balance</p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {formatCurrency(state.data.balance, state.data.currency)}
                </p>
              </div>
              <div className="bg-bg-secondary rounded-xl p-2.5">
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
          <div className="glass-card gradient-border-card rounded-2xl p-4">
            <InsightsPanel
              objectId={accountId}
              level="account"
              currency={state.data.currency}
              token={auth.token}
            />
          </div>

          {/* AI Optimize CTA */}
          <Link
            href={`/accounts/${accountId}/optimize`}
            className="flex items-center justify-between bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/30 rounded-2xl p-5 hover:from-accent/15 hover:to-accent/10 transition-colors group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-text-primary">AI Analysis & Optimization</p>
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
            className="flex items-center justify-between glass-card gradient-border-card rounded-2xl p-5 hover:bg-white/[0.02] transition-colors group"
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
            className="flex items-center justify-between glass-card gradient-border-card rounded-2xl p-5 hover:bg-white/[0.02] transition-colors group"
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
        </div>
      )}
    </PageContainer>
  );
}
