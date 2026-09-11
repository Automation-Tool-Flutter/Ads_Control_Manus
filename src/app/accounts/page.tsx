"use client";

import { useEffect, useDeferredValue, useMemo, memo } from "react";
import { useViewState } from '@/hooks/useViewState';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useAdAccounts } from "@/hooks/useAdAccounts";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusDot } from "@/components/ui/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { CollectionToolbar } from "@/components/ui/CollectionToolbar";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatCurrency, getAccountStatus } from "@/lib/utils";
import type { AdAccount } from "@/lib/types";

const STATUS_PRIORITY: Record<number, number> = {
  1: 0,
  8: 0,
  3: 1,
  100: 1,
  101: 1,
  2: 2,
  7: 2,
  9: 2,
};

function sortAccounts(accounts: AdAccount[]): AdAccount[] {
  return [...accounts].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.account_status] ?? 3;
    const pb = STATUS_PRIORITY[b.account_status] ?? 3;
    return pa - pb;
  });
}

// ─── Metric cell ──────────────────────────────────────────────────────────────
function AccountsHero({ count, activeCount }: { count?: number; activeCount: number }) {
  return <section className="accounts-overview mb-5" aria-labelledby="accounts-title">
    <h1 id="accounts-title" className="sr-only lg:not-sr-only lg:mb-4 lg:text-3xl lg:font-semibold lg:text-text-primary">Ad accounts</h1>
    <div className="accounts-overview-stats">
      <div><span>Connected accounts</span><strong>{count ?? '—'}</strong></div>
      <div><span>Active accounts</span><strong>{count === undefined ? '—' : activeCount}</strong></div>
    </div>
    <p className="mt-3 text-sm leading-5 text-text-secondary">Choose an account to view campaigns and AI insights.</p>
  </section>;
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-metric">
      <span className="block text-[10px] font-bold uppercase text-text-muted">
        {label}
      </span>
      <span className="mt-1 block text-base font-black text-text-primary tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────


// ─── Mobile card ──────────────────────────────────────────────────────────────
const AccountCard = memo(function AccountCard({ account }: { account: AdAccount }) {
  const status = getAccountStatus(account.account_status);
  const fmt = (v?: string) =>
    v && v !== "0" ? formatCurrency(v, account.currency) : "-";

  return (
    <article className="meta-item meta-item-compact group">
      <div className="account-card-header meta-item-header p-4">
      <Link
        href={`/accounts/${account.id}?name=${encodeURIComponent(account.name)}&currency=${account.currency}`}
        className="flex items-start gap-3 active:opacity-80 transition-opacity"
      >
        <div
          className="meta-card-avatar flex flex-shrink-0 items-center justify-center font-semibold"
        >
          {account.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="meta-compact-title text-base font-black leading-snug text-text-primary line-clamp-2">
              {account.name}
          </p>
          <div className="meta-card-status"><StatusDot color={status.color} /><span>{status.label}</span><span aria-hidden="true">·</span><span>{account.currency}</span></div>
          {account.business && (
            <div className="meta-compact-hide mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              <span className="truncate">{account.business.name}</span>
            </div>
          )}
        </div>
      </Link>
      <div className="account-card-identifier"><span>Account ID</span><code>{account.id}</code><CopyButton value={account.id} /></div>
      </div>

      <div className="meta-account-metrics meta-compact-pad grid grid-cols-3 gap-2 p-4">
        <MetricCell label="Spent" value={fmt(account.amount_spent)} />
        <MetricCell label="Balance" value={fmt(account.balance)} />
        <MetricCell
          label="Spend Cap"
          value={
            account.spend_cap && account.spend_cap !== "0"
              ? fmt(account.spend_cap)
              : "Unlimited"
          }
        />
      </div>

      {account.timezone_name && (
          <div className="meta-compact-hide mx-4 mb-3 flex items-center gap-2 rounded-lg border border-border bg-bg-secondary/80 px-3 py-2.5">
            <svg
              className="w-3.5 h-3.5 text-text-muted flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="min-w-0 truncate text-xs font-semibold text-text-muted">
              {account.timezone_name}
            </span>
            <span className="ml-auto rounded-md bg-bg-card px-2 py-1 text-xs font-black text-text-secondary">
              {account.currency}
            </span>
          </div>
      )}

      <div className="meta-card-actions meta-compact-pad grid grid-cols-2 gap-2">
        <Link
          href={`/accounts/${account.id}?name=${encodeURIComponent(account.name)}&currency=${account.currency}`}
          className="meta-action meta-action-primary"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
            />
          </svg>
          AI Dashboard
        </Link>
        <Link
          href={`/accounts/${account.id}/campaigns?accountName=${encodeURIComponent(account.name)}&currency=${account.currency}`}
          className="meta-action meta-action-secondary"
        >
          Campaigns
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </Link>
      </div>
    </article>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const [search, setSearch] = useViewState('search', '');
  const [statusFilter, setStatusFilter] = useViewState('status', 'all');
  const filterSearch = useDeferredValue(search);
  const { state: auth } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace("/login");
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useAdAccounts(auth.token);

  const allAccounts = useMemo(() => state.status === "success" ? sortAccounts(state.data) : [], [state]);
  const accounts = useMemo(() => allAccounts.filter(account => {
    const text = [account.name,account.id,account.business?.name,account.currency].join(' ').toLowerCase();
    return text.includes(filterSearch.trim().toLowerCase()) && (statusFilter === 'all' || (statusFilter === 'active' ? [1,8].includes(account.account_status) : ![1,8].includes(account.account_status)));
  }), [allAccounts, filterSearch, statusFilter]);
  const activeCount = allAccounts.filter((a) =>
    [1, 8].includes(a.account_status),
  ).length;

  if (auth.isLoading || state.status === "idle") return <PageContainer ready={false}><LoadingState message="Loading accounts…" /></PageContainer>;

  return (
    <PageContainer ready={state.status === 'success' && filterSearch === search}>
      <AccountsHero
        count={state.status === "success" ? state.data.length : undefined}
        activeCount={activeCount}
      />
      {state.status === 'success' && <CollectionToolbar search={search} onSearch={setSearch} label="Search ad accounts" placeholder="Search accounts…" count={`${accounts.length} of ${allAccounts.length} accounts`} filterCount={statusFilter === 'all' ? 0 : 1} onReset={() => { setSearch(''); setStatusFilter('all'); }} filters={<label>Account status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="attention">Needs attention</option></select></label>} />}

      {/* Loading */}
      {state.status === "loading" && (
        <LoadingState />
      )}

      {/* Error */}
      {state.status === "error" && (
        <ErrorState
          message={
            state.errorCode === 17 || state.errorCode === 80004
              ? "Meta API rate limit reached. Please wait a few minutes and try again."
              : state.error
          }
          onRetry={retry}
        />
      )}

      {/* Empty */}
      {state.status === "success" && allAccounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-text-primary mb-1">
              No ad accounts connected
            </p>
            <p className="text-text-secondary text-sm max-w-xs">
              This Facebook profile does not expose any ad accounts yet.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {state.status === "success" && allAccounts.length > 0 && accounts.length === 0 && (
        <div className="rounded-2xl border border-border bg-bg-card p-10 text-center"><h2 className="font-semibold text-text-primary">No matching accounts</h2><p className="mt-2 text-sm text-text-muted">Try another name, account ID, or status filter.</p><button onClick={() => { setSearch(''); setStatusFilter('all'); }} className="mt-4 text-sm font-semibold text-accent">Clear filters</button></div>
      )}
      {state.status === "success" && accounts.length > 0 && (
        <>
          {/* Account board */}
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden glass-card gradient-border-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: "Workspace", cls: "" },
                      { label: "Currency", cls: "w-20" },
                      { label: "Spend", cls: "w-28" },
                      { label: "Balance", cls: "w-28" },
                      { label: "Spend Cap", cls: "w-28" },
                      { label: "Timezone", cls: "w-40" },
                      { label: "", cls: "w-28" },
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3.5 whitespace-nowrap ${h.cls}`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {accounts.map((account) => {
                    const status = getAccountStatus(account.account_status);
                    const fmt = (v?: string) =>
                      v && v !== "0"
                        ? formatCurrency(v, account.currency)
                        : "-";
                    return (
                      <tr
                        key={account.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Account name + business + ID */}
                        <td className="px-4 py-4 max-w-[240px]">
                          <div className="flex items-center gap-1.5">
                            <StatusDot color={status.color} />
                            <Link
                              href={`/accounts/${account.id}?name=${encodeURIComponent(account.name)}&currency=${account.currency}`}
                              className="font-medium text-text-primary hover:text-accent transition-colors truncate"
                            >
                              {account.name}
                            </Link>
                          </div>
                          {account.business && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3 text-accent/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                              </svg>
                              <p className="text-xs text-accent/80 font-medium truncate">{account.business.name}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-0.5">
                            <code className="font-mono text-xs text-text-muted">
                              {account.id}
                            </code>
                            <CopyButton value={account.id} />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-text-secondary">
                          {account.currency}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-text-primary whitespace-nowrap tabular-nums">
                          {fmt(account.amount_spent)}
                        </td>
                        <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap tabular-nums">
                          {fmt(account.balance)}
                        </td>
                        <td className="px-4 py-4 text-sm text-text-secondary whitespace-nowrap tabular-nums">
                          {account.spend_cap && account.spend_cap !== "0"
                            ? fmt(account.spend_cap)
                            : "Unlimited"}
                        </td>
                        <td className="px-4 py-4 text-xs text-text-muted whitespace-nowrap">
                          {account.timezone_name ?? "-"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/accounts/${account.id}/campaigns?accountName=${encodeURIComponent(account.name)}&currency=${account.currency}`}
                              className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/15 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Campaigns
                            </Link>
                            <Link
                              href={`/accounts/${account.id}?name=${encodeURIComponent(account.name)}&currency=${account.currency}`}
                              className="text-text-muted hover:text-text-primary transition-colors p-1"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-text-muted text-xs text-right">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </PageContainer>
  );
}
