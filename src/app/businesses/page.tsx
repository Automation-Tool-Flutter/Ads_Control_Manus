"use client";

import { useEffect, useDeferredValue, useMemo } from "react";
import { BusinessAssetCard } from '@/components/businesses/BusinessAssetCard';
import { useViewState } from '@/hooks/useViewState';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { parseBusinessDetail } from "@/lib/api/businesses";
import type { BusinessSummary } from "@/hooks/useBusinessSummary";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from '@/components/ui/LoadingState';
import { CollectionToolbar } from "@/components/ui/CollectionToolbar";
import { StatusDot } from "@/components/ui/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate } from "@/lib/utils";
import type { StatusInfo } from "@/lib/utils";
import type { Business } from "@/lib/types";

function getSummary(b: Business): BusinessSummary {
  const d = parseBusinessDetail(b);
  return { adAccounts: d.adAccounts.length, pages: d.pages.length, instagramAccounts: d.instagramAccounts.length, catalogs: d.catalogs.length, users: d.users.length };
}

function getVerificationStatus(status?: string): StatusInfo {
  if (status === 'verified') return { label: 'Verified', color: 'green' };
  if (status === 'pending')  return { label: 'Pending',  color: 'yellow' };
  if (status === 'not_verified') return { label: 'Not Verified', color: 'gray' };
  return { label: status ?? 'Unknown', color: 'gray' };
}

function BusinessesHero({ count }: { count?: number }) {
  return <WorkspaceHero title="Business assets" count={count} countLabel="Businesses" />;
}

function TableSummaryCells({ summary }: { summary: BusinessSummary | null }) {
  const skeleton = <div className="h-4 w-6 bg-white/8 rounded animate-pulse" />;
  return (
    <>
      <td className="px-4 py-4 text-sm font-semibold text-text-primary tabular-nums">
        {summary === null ? skeleton : summary.adAccounts}
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-text-primary tabular-nums">
        {summary === null ? skeleton : summary.pages}
      </td>
      <td className="px-4 py-4 text-sm font-semibold text-text-primary tabular-nums">
        {summary === null ? skeleton : summary.users}
      </td>
    </>
  );
}



export default function BusinessesPage() {
  const [search, setSearch] = useViewState('search', '');
  const filterSearch = useDeferredValue(search);
  const { state: auth } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace("/login");
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useBusinesses(auth.token);

  const allBusinesses = useMemo(() => state.status === "success" ? state.data : [], [state]);
  const businesses = useMemo(() => allBusinesses.filter(b => `${b.name} ${b.id}`.toLowerCase().includes(filterSearch.trim().toLowerCase())), [allBusinesses, filterSearch]);

  if (auth.isLoading || state.status === "idle") return <PageContainer ready={false}><LoadingState message="Loading business assets…" /></PageContainer>;

  return (
    <PageContainer ready={state.status === 'success' && filterSearch === search}>
      <BusinessesHero count={state.status === "success" ? state.data.length : undefined} />
      {state.status === 'success' && allBusinesses.length > 0 && <CollectionToolbar search={search} onSearch={setSearch} label="Search business assets" placeholder="Search businesses…" count={`${businesses.length} of ${allBusinesses.length} businesses`} onReset={() => setSearch('')} />}
      {state.status === 'success' && allBusinesses.length > 0 && businesses.length === 0 && <div className="collection-empty"><h2>No matching businesses</h2><p>Try another name or business ID.</p><button type="button" onClick={() => setSearch('')}>Clear search</button></div>}

      {/* Loading */}
      {state.status === "loading" && (
        <LoadingState />
      )}

      {/* Error */}
      {state.status === "error" && (
        <ErrorState
          message={state.errorCode === 17 || state.errorCode === 80004
            ? "Meta API rate limit reached. Please wait a few minutes and try again."
            : state.error}
          onRetry={retry}
        />
      )}

      {/* Empty */}
      {state.status === "success" && allBusinesses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-text-primary mb-1">No business portfolios found</p>
            <p className="text-text-secondary text-sm max-w-xs">This Facebook profile does not expose any Business portfolios yet.</p>
          </div>
        </div>
      )}

      {state.status === "success" && businesses.length > 0 && (
        <>
          {/* Portfolio board */}
          <div className="business-asset-list grid md:grid-cols-2 2xl:grid-cols-3">
            {businesses.map(b => <BusinessAssetCard key={b.id} business={b} />)}
          </div>

          {/* Desktop table */}
          <div className="hidden glass-card gradient-border-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  {['Portfolio', 'Created', 'Ad Accounts', 'Pages', 'Users', ''].map((h, i) => (
                    <th key={i} className="text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3.5 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {businesses.map(b => {
                  const initial = b.name.charAt(0).toUpperCase();
                  const vs = getVerificationStatus(b.verification_status);
                  const avatarCls: Record<StatusInfo['color'], string> = {
                    green:  'bg-status-green/15 text-status-green',
                    yellow: 'bg-status-yellow/15 text-status-yellow',
                    red:    'bg-status-red/15 text-status-red',
                    gray:   'bg-text-muted/15 text-text-muted',
                  };
                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-4 max-w-[260px]">
                        <div className="flex items-center gap-3">
                          {b.profile_picture_uri ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.profile_picture_uri} alt={b.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarCls[vs.color]}`}>
                              {initial}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <StatusDot color={vs.color} />
                              <Link href={`/businesses/${b.id}`} className="font-medium text-text-primary hover:text-accent transition-colors truncate">
                                {b.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <code className="font-mono text-[11px] text-text-muted truncate">{b.id}</code>
                              <CopyButton value={b.id} />
                            </div>
                            {b.primary_page && (
                              <Link href={`/pages/${b.primary_page.id}`} className="text-xs text-accent hover:underline truncate block mt-0.5">
                                {b.primary_page.name}
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap">
                        {b.created_time ? formatDate(b.created_time) : '—'}
                      </td>
                      <TableSummaryCells summary={getSummary(b)} />
                      <td className="px-4 py-4">
                        <Link
                          href={`/businesses/${b.id}`}
                          className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/15 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Open profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <p className="mt-3 text-text-muted text-xs text-right">
            {businesses.length} business{businesses.length !== 1 ? "es" : ""}
          </p>
        </>
      )}
    </PageContainer>
  );
}
import { WorkspaceHero } from '@/components/layout/WorkspaceHero';
