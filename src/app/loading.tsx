import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/ui/LoadingState';

export default function Loading() {
  return <PageContainer ready={false}><LoadingState message="Opening your workspace…" /></PageContainer>;
}
