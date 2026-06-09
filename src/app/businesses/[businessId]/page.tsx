"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessDetail } from "@/hooks/useBusinessDetail";
import { PageContainer } from "@/components/layout/PageContainer";
import { CopyButton } from "@/components/ui/CopyButton";
import { StatusDot } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { formatDate, getAccountStatus } from "@/lib/utils";
import type { StatusInfo } from "@/lib/utils";
import type {
  BusinessAdAccount,
  BusinessPage,
  BusinessInstagramAccount,
  BusinessUser,
  Catalog,
} from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVerificationStatus(status?: string): StatusInfo {
  if (status === "verified") return { label: "Verified", color: "green" };
  if (status === "pending") return { label: "Pending", color: "yellow" };
  if (status === "not_verified")
    return { label: "Not Verified", color: "gray" };
  return { label: status ?? "Unknown", color: "gray" };
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TAB_KEYS = [
  "adAccounts",
  "pages",
  "users",
  "catalogs",
  "instagram",
] as const;
type Tab = (typeof TAB_KEYS)[number];

const TAB_LABELS: Record<Tab, string> = {
  adAccounts: "Ad Accounts",
  pages: "Pages",
  users: "Users",
  catalogs: "Catalogs",
  instagram: "Instagram",
};

// ─── Section helpers ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-base font-black text-text-primary">
        {title}
      </h3>
      {count !== undefined && (
        <span className="rounded-md bg-bg-secondary px-3 py-1 text-xs font-black text-text-secondary">
          {count} total
        </span>
      )}
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-secondary/70 py-10 text-center">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-bg-card">
        <svg
          className="h-5 w-5 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-text-muted">{message}</p>
    </div>
  );
}

// ─── Ad Accounts Section ───────────────────────────────────────────────────────

function AdAccountsSection({ accounts }: { accounts: BusinessAdAccount[] }) {
  const avatarStyle: Record<StatusInfo["color"], string> = {
    green: "bg-status-green/15 text-status-green",
    yellow: "bg-status-yellow/15 text-status-yellow",
    red: "bg-status-red/15 text-status-red",
    gray: "bg-text-muted/15 text-text-muted",
  };

  if (accounts.length === 0) return <EmptySection message="No ad accounts" />;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b border-border/50">
              {["Account", "Currency", "Ownership"].map((h) => (
                <th
                  key={h}
                  className="text-left text-[10px] font-medium text-text-muted uppercase tracking-wide px-3 py-2.5 first:pl-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {accounts.map((a) => {
              const st = getAccountStatus(a.account_status);
              return (
                <tr key={a.id} className="group">
                  <td className="py-3 pr-4 first:pl-0">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarStyle[st.color]}`}
                      >
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StatusDot color={st.color} />
                          <Link
                            href={`/accounts/${a.id}`}
                            className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate"
                          >
                            {a.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="font-mono text-[10px] text-text-muted">
                            {a.id}
                          </code>
                          <CopyButton value={a.id} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-sm text-text-secondary">
                    {a.currency}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${a.ownership === "owned" ? "bg-accent/15 text-accent" : "bg-bg-secondary text-text-muted"}`}
                    >
                      {a.ownership}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 sm:hidden">
        {accounts.map((a) => {
          const st = getAccountStatus(a.account_status);
          return (
            <div
              key={a.id}
              className="meta-item meta-item-compact meta-compact-pad flex items-center gap-3 p-3"
            >
              <div
                className={`h-8 w-1.5 flex-shrink-0 rounded-full ${a.ownership === "owned" ? "bg-accent/60" : "bg-text-muted/25"}`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <StatusDot color={st.color} />
                  <Link
                    href={`/accounts/${a.id}`}
                    className="font-medium text-text-primary hover:text-accent transition-colors truncate text-sm"
                  >
                    {a.name}
                  </Link>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <code className="font-mono text-[11px] text-text-muted truncate">
                    {a.id}
                  </code>
                  <CopyButton value={a.id} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] text-text-muted font-medium">
                  {a.currency}
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${a.ownership === "owned" ? "bg-accent/10 text-accent" : "bg-bg-secondary text-text-muted"}`}
                >
                  {a.ownership}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Pages Section ─────────────────────────────────────────────────────────────

function PagesSection({ pages }: { pages: BusinessPage[] }) {
  if (pages.length === 0) return <EmptySection message="No pages" />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {pages.map((p) => (
        <Link
          key={p.id}
          href={`/pages/${p.id}`}
          className="meta-item meta-item-compact meta-compact-pad group flex items-center gap-3 p-3.5 hover:text-accent"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <svg
              className="w-4 h-4 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary group-hover:text-accent transition-colors truncate text-sm">
              {p.name}
            </p>
            <code className="font-mono text-[10px] text-text-muted">
              {p.id}
            </code>
          </div>
          <svg
            className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors flex-shrink-0"
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
      ))}
    </div>
  );
}

// ─── Catalogs Section ──────────────────────────────────────────────────────────

function CatalogsSection({ catalogs }: { catalogs: Catalog[] }) {
  if (catalogs.length === 0)
    return <EmptySection message="No product catalogs" />;
  return (
      <div className="grid gap-3">
        {catalogs.map((c) => (
          <div
            key={c.id}
            className="meta-item meta-item-compact meta-compact-pad flex items-center gap-3 p-3"
          >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-secondary">
            <svg
              className="w-4 h-4 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary text-sm truncate">
              {c.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <code className="font-mono text-[10px] text-text-muted truncate">
                {c.id}
              </code>
              <CopyButton value={c.id} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {c.product_count !== undefined && (
              <span className="text-sm font-semibold text-text-primary tabular-nums">
                {c.product_count}
              </span>
            )}
            {c.vertical && (
              <span className="rounded-md bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-muted">
                {c.vertical}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Instagram Section ─────────────────────────────────────────────────────────

function InstagramSection({
  accounts,
}: {
  accounts: BusinessInstagramAccount[];
}) {
  if (accounts.length === 0)
    return <EmptySection message="No Instagram accounts" />;
  return (
    <div className="grid gap-3">
      {accounts.map((a) => {
        const pictureUrl = a.profile_picture_url ?? a.profile_pic;
        return (
          <div
            key={a.id}
            className="meta-item meta-item-compact meta-compact-pad flex items-center gap-3 p-3"
          >
            {pictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pictureUrl}
                alt={a.username ?? a.name ?? ""}
                className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
              />
            ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-bg-secondary">
              <svg
                className="w-4 h-4 text-text-muted"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary text-sm">
                {a.username ? `@${a.username}` : (a.name ?? a.id)}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <code className="font-mono text-[10px] text-text-muted truncate">
                  {a.id}
                </code>
                <CopyButton value={a.id} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Users Section ─────────────────────────────────────────────────────────────

function roleBadgeClass(role?: string): string {
  if (!role) return "bg-bg-secondary text-text-muted";
  if (role === "ADMIN") return "bg-accent/15 text-accent";
  if (role === "ADVERTISER") return "bg-status-green/15 text-status-green";
  if (role.startsWith("FINANCE"))
    return "bg-status-yellow/15 text-status-yellow";
  if (role === "ANALYST") return "bg-bg-secondary text-text-secondary";
  return "bg-bg-secondary text-text-muted";
}

function roleLabel(role?: string): string {
  if (!role) return "Unknown";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const USERS_PAGE_SIZE = 6;

function UserCard({ u }: { u: BusinessUser }) {
  const initials = (u.name || u.id || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const infoItems = [
    {
      label: "ID",
      content: (
        <div className="flex items-center gap-1">
          <code className="font-mono text-[11px] text-text-secondary truncate">
            {u.id}
          </code>
          <CopyButton value={u.id} />
        </div>
      ),
    },
    u.email
      ? {
          label: "Email",
          content: (
            <span className="text-[11px] text-text-secondary truncate block">
              {u.email}
            </span>
          ),
        }
      : null,
    u.title
      ? {
          label: "Title",
          content: (
            <span className="text-[11px] text-text-secondary truncate block">
              {u.title}
            </span>
          ),
        }
      : null,
    u.created_time
      ? {
          label: "Joined",
          content: (
            <span className="text-[11px] text-text-secondary">
              {formatDate(u.created_time)}
            </span>
          ),
        }
      : null,
  ].filter(Boolean) as { label: string; content: React.ReactNode }[];

  return (
    <div className="meta-item meta-item-compact">
      <div className="p-4 flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-accent/15 text-base font-bold text-accent">
          {initials}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-bold text-text-primary text-sm leading-snug truncate">
            {u.name}
          </p>
          <span
            className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass(u.role)}`}
          >
            {roleLabel(u.role)}
          </span>
        </div>
      </div>
      {infoItems.length > 0 && (
        <div
          className="border-t border-border/40 grid divide-x divide-border/40"
          style={{
            gridTemplateColumns: `repeat(${Math.min(infoItems.length, 2)}, 1fr)`,
          }}
        >
          {infoItems.map((item) => (
            <div key={item.label} className="px-3 py-2.5">
              <p className="mb-1 text-[9px] font-bold uppercase text-text-muted">
                {item.label}
              </p>
              {item.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersSection({ users }: { users: BusinessUser[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? users : users.slice(0, USERS_PAGE_SIZE);
  const hidden = users.length - USERS_PAGE_SIZE;

  if (users.length === 0) return <EmptySection message="No users" />;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visible.map((u) => (
          <UserCard key={u.id} u={u} />
        ))}
      </div>
      {hidden > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="meta-action meta-action-secondary mt-3 w-full text-xs"
        >
          Show {hidden} more user{hidden > 1 ? "s" : ""}
        </button>
      )}
      {expanded && users.length > USERS_PAGE_SIZE && (
        <button
          onClick={() => setExpanded(false)}
          className="meta-action meta-action-secondary mt-3 w-full text-xs"
        >
          Show less
        </button>
      )}
    </>
  );
}

// ─── Overview Donut Chart ─────────────────────────────────────────────────────

const CHART_ITEMS: { key: Tab; label: string; color: string }[] = [
  { key: "adAccounts", label: "Ad Accounts", color: "#3b82f6" },
  { key: "pages", label: "Pages", color: "#22c55e" },
  { key: "users", label: "Users", color: "#eab308" },
  { key: "catalogs", label: "Catalogs", color: "#ec4899" },
  { key: "instagram", label: "Instagram", color: "#fb923c" },
];

function OverviewChart({
  counts,
  activeTab,
  onTabChange,
}: {
  counts: Record<Tab, number>;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const total = CHART_ITEMS.reduce((s, i) => s + counts[i.key], 0);

  return (
    <section className="meta-item p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-accent">
            Asset Overview
          </p>
          <h2 className="mt-0.5 text-base font-black text-text-primary sm:text-lg">
            Connected Workspace
          </h2>
        </div>
        <div className="rounded-md border border-border bg-bg-secondary px-3 py-1.5 text-right">
          <span className="text-lg font-black tabular-nums text-text-primary">{total}</span>
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Total
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-lg border border-border bg-bg-secondary p-1 scrollbar-none sm:grid sm:grid-cols-5 sm:overflow-visible">
        {CHART_ITEMS.map((seg) => {
            const active = activeTab === seg.key;
            const count = counts[seg.key];
            return (
              <button
                key={seg.key}
                onClick={() => onTabChange(seg.key)}
              className={`flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-black transition-colors sm:min-w-0 sm:flex-1 ${
                active
                  ? "bg-bg-card text-text-primary shadow-sm"
                  : "text-text-muted hover:bg-bg-card/70 hover:text-text-secondary"
              }`}
              >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="whitespace-nowrap">
                  {seg.label}
                </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-accent/12 text-accent" : "bg-bg-card text-text-muted"}`}>
                  {count}
                </span>
              </button>
            );
        })}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BusinessDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ businessId: string }>();
  const businessId = params.businessId;

  const [activeTab, setActiveTab] = useState<Tab>("adAccounts");

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace("/login");
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useBusinessDetail(businessId, auth.token);

  if (auth.isLoading || state.status === "idle") return null;

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href="/businesses"
          className="meta-action meta-action-secondary text-xs"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Business Portfolio
        </Link>
      </div>

      {state.status === "loading" && (
        <LoadingState message="Loading business info..." />
      )}
      {state.status === "error" && (
        <ErrorState message={state.error} onRetry={retry} />
      )}

      {state.status === "success" &&
        (() => {
          const {
            detail,
            adAccounts,
            pages,
            instagramAccounts,
            catalogs,
            users,
          } = state.data;
          const verStatus = getVerificationStatus(detail.verification_status);
          const avatarStyle: Record<StatusInfo["color"], string> = {
            green: "bg-emerald-100 text-emerald-700",
            yellow: "bg-amber-100 text-amber-700",
            red: "bg-rose-100 text-rose-700",
            gray: "bg-slate-100 text-slate-600",
          };

          const tabCounts: Record<Tab, number> = {
            adAccounts: adAccounts.length,
            pages: pages.length,
            users: users.length,
            catalogs: catalogs.length,
            instagram: instagramAccounts.length,
          };

          return (
            <div className="space-y-4">
              {/* ── Identity card ─────────────────────────────────────────── */}
              <section className="meta-item p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  {detail.profile_picture_uri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detail.profile_picture_uri}
                      alt={detail.name}
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg text-2xl font-black ${avatarStyle[verStatus.color]}`}
                    >
                      {detail.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-2.5 py-1 text-[11px] font-bold text-text-secondary shadow-sm">
                      <StatusDot color={verStatus.color} />
                      {verStatus.label}
                    </div>
                    <h1 className="text-2xl font-black leading-tight text-text-primary sm:text-3xl">
                      {detail.name}
                    </h1>
                    <div className="mt-2 flex max-w-full items-center gap-1.5">
                      <code className="min-w-0 truncate rounded-md bg-bg-secondary px-2.5 py-1.5 font-mono text-[11px] text-text-muted">
                        {detail.id}
                      </code>
                      <CopyButton value={detail.id} />
                    </div>
                  </div>
                </div>

                {(detail.created_time ||
                  detail.timezone_id !== undefined ||
                  detail.primary_page) && (
                  <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
                    {detail.created_time && (
                      <div className="meta-metric">
                        <p className="text-[10px] font-bold uppercase text-text-muted">
                          Created
                        </p>
                        <p className="mt-1 text-sm font-black text-text-primary">
                          {formatDate(detail.created_time)}
                        </p>
                      </div>
                    )}
                    {detail.timezone_id !== undefined && (
                      <div className="meta-metric">
                        <p className="text-[10px] font-bold uppercase text-text-muted">
                          Timezone ID
                        </p>
                        <p className="mt-1 text-sm font-black text-text-primary">
                          {detail.timezone_id}
                        </p>
                      </div>
                    )}
                    {detail.primary_page && (
                      <div className="meta-metric">
                        <p className="text-[10px] font-bold uppercase text-text-muted">
                          Primary Page
                        </p>
                        <Link
                          href={`/pages/${detail.primary_page.id}`}
                          className="mt-1 block truncate text-sm font-black text-accent hover:underline"
                        >
                          {detail.primary_page.name}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ── Overview donut chart ──────────────────────────────────── */}
              <OverviewChart
                counts={tabCounts}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {/* ── Tab bar + content ─────────────────────────────────────── */}
              <section className="meta-item p-2.5 sm:p-3">
                {/* Tab bar */}
                <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden rounded-lg bg-bg-secondary p-1 scrollbar-none">
                  {TAB_KEYS.map((key) => {
                    const active = activeTab === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex min-h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-black whitespace-nowrap transition-colors sm:flex-1
                        ${active ? "bg-bg-card text-text-primary shadow-sm" : "text-text-muted hover:bg-bg-card/70 hover:text-text-secondary"}`}
                      >
                        {TAB_LABELS[key]}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? "bg-accent/15 text-accent" : "bg-white text-text-muted"}`}
                        >
                          {tabCounts[key]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab content */}
                <div className="p-2 pt-4 sm:p-4">
                  {activeTab === "adAccounts" && (
                    <>
                      <SectionHeader
                        title="Ad Accounts"
                        count={adAccounts.length}
                      />
                      <AdAccountsSection accounts={adAccounts} />
                    </>
                  )}
                  {activeTab === "pages" && (
                    <>
                      <SectionHeader title="Pages" count={pages.length} />
                      <PagesSection pages={pages} />
                    </>
                  )}
                  {activeTab === "users" && (
                    <>
                      <SectionHeader title="Users" count={users.length} />
                      <UsersSection users={users} />
                    </>
                  )}
                  {activeTab === "catalogs" && (
                    <>
                      <SectionHeader
                        title="Product Catalogs"
                        count={catalogs.length}
                      />
                      <CatalogsSection catalogs={catalogs} />
                    </>
                  )}
                  {activeTab === "instagram" && (
                    <>
                      <SectionHeader
                        title="Instagram Accounts"
                        count={instagramAccounts.length}
                      />
                      <InstagramSection accounts={instagramAccounts} />
                    </>
                  )}
                </div>
              </section>
            </div>
          );
        })()}
    </PageContainer>
  );
}
