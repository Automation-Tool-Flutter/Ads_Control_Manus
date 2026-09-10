'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AccountAIDashboard } from '@/components/dashboard/AccountAIDashboard';

export default function AccountDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const { state, retry } = useAccountDetail(accountId, auth.token);
  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  if (auth.isLoading || !auth.token) return null;
  return <PageContainer>
    {state.status === 'error' ? <ErrorState message={state.error} onRetry={retry} /> :
      state.status !== 'success' ? <LoadingState message="Opening AI Workspace…" /> :
        <AccountAIDashboard accountId={accountId} name={state.data.name} currency={state.data.currency} token={auth.token} />}
  </PageContainer>;
}
