'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePages } from '@/hooks/usePages';
import { PageContainer } from '@/components/layout/PageContainer';
import { ReauthError } from '@/components/ui/ReauthError';
import type { Page } from '@/lib/types';

function PagesHero({ count }: { count?: number }) {
  return (
    <section className="relative mb-5 overflow-hidden rounded-[2rem] border border-border bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-100/80" />
      <div className="absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-emerald-100/80" />

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-text-primary text-white shadow-[0_14px_34px_rgba(15,23,42,0.22)]">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h6m-7.5 7.5h12A2.25 2.25 0 0020.25 17V7A2.25 2.25 0 0018 4.75H6A2.25 2.25 0 003.75 7v10A2.25 2.25 0 006 19.5z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex rounded-full bg-accent/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-accent">
            Content Workspace
          </div>
          <h1 className="text-2xl font-black leading-tight text-text-primary sm:text-3xl">
            Page Library
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-text-secondary">
            Review connected Pages, publishing access, audience size, and content workflows from one clean workspace.
          </p>
        </div>
        {count !== undefined && (
          <div className="hidden rounded-3xl border border-border bg-bg-secondary px-5 py-4 text-center sm:block">
            <div className="text-3xl font-black tabular-nums text-text-primary">{count}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Pages</div>
          </div>
        )}
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[2rem] border border-border bg-white/90 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] animate-pulse">
      <div className="flex gap-3">
        <div className="h-24 w-24 rounded-[1.5rem] bg-bg-tertiary" />
        <div className="min-w-0 flex-1 py-1">
          <div className="h-4 w-3/4 rounded-full bg-bg-tertiary" />
          <div className="mt-2 h-3 w-1/2 rounded-full bg-bg-secondary" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-11 rounded-2xl bg-bg-secondary" />
            <div className="h-11 rounded-2xl bg-bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PageCard({ page }: { page: Page }) {
  const isVerified = page.verification_status === 'blue_verified' || page.verification_status === 'gray_verified';

  return (
    <Link
      href={`/pages/${page.id}?name=${encodeURIComponent(page.name)}`}
      className="group relative overflow-hidden rounded-[2rem] border border-border bg-white/90 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
    >
      <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[3rem] bg-emerald-100/70" />
      <div className="relative flex gap-3">
        {page.picture?.data.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.picture.data.url}
            alt={page.name}
            className="h-24 w-24 shrink-0 rounded-[1.5rem] object-cover ring-4 ring-white"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.5rem] bg-accent/15 text-3xl font-black text-accent ring-4 ring-white">
            {page.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-start gap-2 pr-7">
          <p className="text-base font-black leading-snug text-text-primary line-clamp-2">{page.name}</p>
          {isVerified && (
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.614 3.066 3.745 3.745 0 01-3.066.614 3.745 3.745 0 01-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.066-.614 3.745 3.745 0 01-.614-3.066A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.614-3.066 3.745 3.745 0 013.066-.614A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.066.614 3.745 3.745 0 01.614 3.066A3.744 3.744 0 0121 12z" />
            </svg>
          )}
          </div>
        {page.business?.name && (
          <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <span className="truncate">{page.business.name}</span>
          </div>
        )}
        {page.category && (
          <p className="mt-1.5 text-xs font-medium text-text-muted line-clamp-1">{page.category}</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-text-secondary">
          {page.fan_count !== undefined && (
            <span className="rounded-2xl border border-border bg-bg-secondary px-3 py-2.5 font-black">{page.fan_count.toLocaleString()} likes</span>
          )}
          {page.followers_count !== undefined && (
            <span className="rounded-2xl border border-border bg-bg-secondary px-3 py-2.5 font-black">{page.followers_count.toLocaleString()} followers</span>
          )}
        </div>
        </div>
      </div>

      <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-text-muted shadow-sm transition-transform group-hover:translate-x-1">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
      </div>
    </Link>
  );
}

export default function PagesPage() {
  const { state: auth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
  }, [auth.isLoading, auth.token, router]);

  const { state, retry, loadMore, hasMore, loadingMore } = usePages(auth.token);

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <PagesHero count={state.status === 'success' ? state.data.length : undefined} />

      {state.status === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {state.status === 'error' && (
        <ReauthError message={state.error} errorCode={state.errorCode} permissionHint="pages_show_list" onRetry={retry} />
      )}

      {state.status === 'success' && state.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-text-primary mb-1">No Pages connected</p>
            <p className="text-text-secondary text-sm max-w-xs">
              Connect or create a Page before managing content from this workspace.
            </p>
          </div>
          <a
            href="https://www.facebook.com/pages/create"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
          >
            Create a Page on Facebook
          </a>
        </div>
      )}

      {state.status === 'success' && state.data.length > 0 && (
        <>
          {/* Mobile + Desktop: card list (same layout, table not needed for pages) */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.data.map(page => (
              <PageCard key={page.id} page={page} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 w-full py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-white/[0.03] disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load more Pages'}
            </button>
          )}
          <p className="mt-3 text-text-muted text-xs text-right">{state.data.length} connected page{state.data.length !== 1 ? 's' : ''}</p>
        </>
      )}
    </PageContainer>
  );
}
