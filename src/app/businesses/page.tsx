"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinesses } from "@/hooks/useBusinesses";
import { parseBusinessDetail } from "@/lib/api/businesses";
import type { BusinessSummary } from "@/hooks/useBusinessSummary";
import { PageContainer } from "@/components/layout/PageContainer";
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
  return (
    <section className="relative mb-5 overflow-hidden rounded-[2rem] border border-border bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-100/80" />
      <div className="absolute -bottom-14 left-10 h-32 w-32 rounded-full bg-sky-100/80" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-text-primary text-white shadow-[0_14px_34px_rgba(15,23,42,0.22)]">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex rounded-full bg-accent/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-accent">
            Asset Map
          </div>
          <h1 className="text-2xl font-black leading-tight text-text-primary sm:text-3xl">
            Business Portfolio
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-text-secondary">
            Navigate portfolios, connected Pages, catalogs, users, and ad accounts from a cleaner control surface.
          </p>
        </div>

        {count !== undefined && (
          <div className="hidden rounded-3xl border border-border bg-bg-secondary px-5 py-4 text-center sm:block">
            <div className="text-3xl font-black tabular-nums text-text-primary">{count}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Businesses</div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatChips({ summary }: { summary: BusinessSummary }) {
  const items = [
    { label: 'Ad Accounts', value: summary.adAccounts, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
    { label: 'Pages', value: summary.pages, tone: 'bg-violet-50 text-violet-700 border-violet-100' },
    { label: 'Users', value: summary.users, tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Catalogs', value: summary.catalogs, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(({ label, value, tone }) => (
        <div key={label} className={`rounded-2xl border px-3 py-2.5 ${tone}`}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</span>
          <span className="mt-1 block text-xl font-black tabular-nums text-text-primary">{value}</span>
        </div>
      ))}
    </div>
  );
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

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-white/85 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] animate-pulse">
      <div className="absolute inset-y-0 left-0 w-2 bg-bg-tertiary" />
      <div className="rounded-[1.5rem] bg-bg-secondary/80 p-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl bg-bg-tertiary flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-bg-tertiary rounded-full w-4/5" />
            <div className="h-3 bg-bg-tertiary/70 rounded-full w-1/2" />
          </div>
          <div className="h-7 w-20 bg-bg-tertiary rounded-full" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-14 rounded-2xl bg-bg-secondary" />
        <div className="h-14 rounded-2xl bg-bg-secondary" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-bg-secondary" />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-11 rounded-2xl bg-bg-tertiary" />
        <div className="h-11 rounded-2xl bg-bg-secondary" />
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white/75 px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <span className="block text-[10px] font-semibold text-text-muted uppercase tracking-wide">{label}</span>
      <span className="mt-1 block text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function BusinessCard({ business }: { business: Business }) {
  const initial = business.name.charAt(0).toUpperCase();
  const detail = parseBusinessDetail(business);
  const summary: BusinessSummary = {
    adAccounts: detail.adAccounts.length,
    pages: detail.pages.length,
    instagramAccounts: detail.instagramAccounts.length,
    catalogs: detail.catalogs.length,
    users: detail.users.length,
  };
  const verStatus = getVerificationStatus(business.verification_status);
  const avatarStyle: Record<StatusInfo['color'], string> = {
    green:  'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    red:    'bg-rose-100 text-rose-700',
    gray:   'bg-slate-100 text-slate-600',
  };
  const railStyle: Record<StatusInfo['color'], string> = {
    green:  'bg-emerald-400',
    yellow: 'bg-amber-400',
    red:    'bg-rose-400',
    gray:   'bg-slate-300',
  };

  const infoItems: { label: string; value: React.ReactNode }[] = [];
  if (business.created_time) {
    infoItems.push({ label: 'Created', value: formatDate(business.created_time) });
  }
  if (business.timezone_id !== undefined) {
    infoItems.push({ label: 'Timezone ID', value: String(business.timezone_id) });
  }
  if (business.primary_page) {
    infoItems.push({
      label: 'Primary Page',
      value: (
        <Link
          href={`/pages/${business.primary_page.id}`}
          onClick={e => e.stopPropagation()}
          className="text-accent hover:underline truncate block"
        >
          {business.primary_page.name}
        </Link>
      ),
    });
  }

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-border bg-white/90 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
      <div className={`absolute inset-y-0 left-0 w-2 ${railStyle[verStatus.color]}`} />

      <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#f8fafc_0%,#eef7f3_100%)] p-4">
        <Link href={`/businesses/${business.id}`} className="flex items-start gap-3 active:opacity-80 transition-opacity">
          {business.profile_picture_uri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.profile_picture_uri} alt={business.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 ring-4 ring-white" />
          ) : (
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0 ring-4 ring-white ${avatarStyle[verStatus.color]}`}>
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-text-secondary shadow-sm">
              <StatusDot color={verStatus.color} />
              {verStatus.label}
            </div>
            <p className="text-base font-black leading-snug text-text-primary line-clamp-2">{business.name}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <code className="min-w-0 truncate rounded-full bg-white/80 px-2 py-1 font-mono text-[11px] text-text-muted">{business.id}</code>
              <CopyButton value={business.id} />
            </div>
          </div>
        </Link>
      </div>

      {infoItems.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {infoItems.map((item, i) => (
            <InfoCell key={i} label={item.label} value={item.value} />
          ))}
        </div>
      )}

      <div className="mt-3">
        <StatChips summary={summary} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/businesses/${business.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-text-primary px-3 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 active:bg-slate-900"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
          Open assets
        </Link>
        <Link
          href={`/businesses/${business.id}`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-bold text-text-secondary transition-colors hover:bg-bg-secondary active:bg-bg-tertiary"
        >
          Full profile
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function BusinessesPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace("/");
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useBusinesses(auth.token);

  if (auth.isLoading || state.status === "idle") return null;

  const businesses = state.status === "success" ? state.data : [];

  return (
    <PageContainer>
      <BusinessesHero count={state.status === "success" ? state.data.length : undefined} />

      {/* Loading */}
      {state.status === "loading" && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
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
      {state.status === "success" && businesses.length === 0 && (
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {businesses.map(b => <BusinessCard key={b.id} business={b} />)}
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
