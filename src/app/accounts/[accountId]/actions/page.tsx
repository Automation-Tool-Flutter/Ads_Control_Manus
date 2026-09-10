'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { ActionCenter } from '@/components/dashboard/ActionCenter';
export default function ActionsPage() {
  const { state } = useAuth(); const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  useEffect(() => { if (!state.isLoading && !state.token) router.replace('/login'); }, [state.isLoading,state.token,router]);
  if (!state.token) return null;
  return <PageContainer><ActionCenter key={accountId} accountId={accountId} /></PageContainer>;
}
