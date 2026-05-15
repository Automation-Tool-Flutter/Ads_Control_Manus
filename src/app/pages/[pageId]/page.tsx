'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePages } from '@/hooks/usePages';
import { usePagePosts } from '@/hooks/usePagePosts';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import type { AdAccount } from '@/lib/types';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ReauthError } from '@/components/ui/ReauthError';
import { PostCard } from '@/components/pages/PostCard';
import { ScheduledPostCard } from '@/components/pages/ScheduledPostCard';
import { BoostModal } from '@/components/pages/BoostModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deletePagePost } from '@/lib/api/pagePostMutations';
import { getScheduledPosts } from '@/lib/api/pagePosts';
import { GraphApiError, cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import { useToast } from '@/components/ui/Toaster';
import type { PagePost, AsyncState } from '@/lib/types';

// Lazy wrapper — useAdAccounts only fetches when boost modal is actually needed
function BoostModalContainer({ post, pageId, pageBusiness, token, onClose, onSuccess }: {
  post: PagePost;
  pageId: string;
  pageBusiness?: { id: string; name: string };
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { state } = useAdAccounts(token || null);
  const allAccounts: AdAccount[] = state.status === 'success' ? state.data : [];

  const adAccounts = useMemo(() => {
    if (!allAccounts.length) return allAccounts;
    const filtered = pageBusiness
      ? allAccounts.filter(acc => acc.business?.id === pageBusiness.id)
      : allAccounts.filter(acc => !acc.business);
    return filtered.length > 0 ? filtered : allAccounts;
  }, [allAccounts, pageBusiness]);

  return (
    <BoostModal
      post={post}
      pageId={pageId}
      adAccounts={adAccounts}
      token={token}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

export default function PageDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ pageId: string }>();
  const { pageId } = params;
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
  }, [auth.isLoading, auth.token, router]);

  const { state: pagesState } = usePages(auth.token);

  const page = pagesState.status === 'success'
    ? pagesState.data.find(p => p.id === pageId)
    : null;

  // Use Page Access Token — New Page Experience rejects User Access Token (error_subcode 2069032)
  const pageToken = page?.access_token ?? null;

  const { state: postsState, retry: retryPosts, loadMore: loadMorePosts, hasMore: hasMorePosts, loadingMore: loadingMorePosts } = usePagePosts(pageId, pageToken);

  const [boostPost, setBoostPost] = useState<PagePost | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);


  // Scheduled posts
  const [activeTab, setActiveTab] = useState<'published' | 'scheduled'>(
    searchParams.get('tab') === 'scheduled' ? 'scheduled' : 'published'
  );
  const [scheduledState, setScheduledState] = useState<AsyncState<PagePost[]>>({ status: 'idle' });
  const [scheduledRefreshKey, setScheduledRefreshKey] = useState(0);
  const [deleteScheduledId, setDeleteScheduledId] = useState<string | null>(null);
  const [deletingScheduled, setDeletingScheduled] = useState(false);

  async function handleDelete() {
    if (!deletePostId || !pageToken) return;
    setDeleting(true);
    try {
      await deletePagePost(deletePostId, pageToken);
      toast('Post deleted', 'success');
      setDeletePostId(null);
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${pageId}/posts`);
      retryPosts();
    } catch (err) {
      const msg =
        err instanceof GraphApiError && err.code === 100
          ? 'Facebook does not allow deleting this post (Reel, shared post or video).'
          : err instanceof Error ? err.message : 'Delete failed';
      toast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  }

  // Fetch scheduled posts on load and on refresh — activeTab not in deps
  // so badge count is always available regardless of which tab is active
  useEffect(() => {
    if (!pageToken) return;
    let cancelled = false;
    // Show skeleton only if no data yet; keep existing data visible during re-fetch
    setScheduledState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    getScheduledPosts(pageId, pageToken)
      .then(posts => {
        if (cancelled) return;
        setScheduledState({ status: 'success', data: posts });
        const now = Date.now() / 1000;
        const hasPastDue = posts.some(p => p.scheduled_publish_time && p.scheduled_publish_time <= now);
        if (hasPastDue) cacheInvalidatePrefix(`${GRAPH_API_BASE}/${pageId}/posts`);
      })
      .catch(err => {
        if (!cancelled) setScheduledState(prev =>
          prev.status === 'success' ? prev : { status: 'error', error: err instanceof Error ? err.message : 'Failed to load scheduled posts' }
        );
      });
    return () => { cancelled = true; };
  }, [pageToken, pageId, scheduledRefreshKey]);

  async function handleDeleteScheduled() {
    if (!deleteScheduledId || !pageToken) return;
    setDeletingScheduled(true);
    try {
      await deletePagePost(deleteScheduledId, pageToken);
      toast('Scheduled post deleted', 'success');
      setDeleteScheduledId(null);
      setScheduledRefreshKey(k => k + 1);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeletingScheduled(false);
    }
  }

  function handleEditScheduled(post: PagePost) {
    router.push(`/pages/${pageId}/posts/${post.id}/edit`);
  }

  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <div className="mb-5">
        <Breadcrumb
          items={[
            { label: 'Pages', href: '/pages' },
            { label: page?.name ?? pageId },
          ]}
        />
      </div>

      {/* Page info card */}
      {page && (
        <div className="glass-card gradient-border-card rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            {page.picture?.data.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.picture.data.url} alt={page.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-accent/20 flex items-center justify-center text-accent font-bold text-2xl flex-shrink-0">
                {page.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{page.name}</h1>
                {(page.verification_status === 'blue_verified' || page.verification_status === 'gray_verified') && (
                  <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-.614 3.066 3.745 3.745 0 01-3.066.614 3.745 3.745 0 01-3.068 1.593c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-3.066-.614 3.745 3.745 0 01-.614-3.066A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 01.614-3.066 3.745 3.745 0 013.066-.614A3.745 3.745 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 013.066.614 3.745 3.745 0 01.614 3.066A3.744 3.744 0 0121 12z" />
                  </svg>
                )}
              </div>
              {page.business?.name && (
                <div className="flex items-center gap-1 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-accent/70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  <p className="text-sm text-accent/80 font-medium">{page.business.name}</p>
                </div>
              )}
              {page.category && <p className="text-sm text-text-muted mt-0.5">{page.category}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            {page.fan_count !== undefined && (
              <span><span className="font-semibold text-text-primary">{page.fan_count.toLocaleString()}</span> likes</span>
            )}
            {page.followers_count !== undefined && (
              <span><span className="font-semibold text-text-primary">{page.followers_count.toLocaleString()}</span> followers</span>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
            <Link
              href={`/pages/${pageId}/insights`}
              className="text-xs font-medium text-text-secondary hover:text-accent bg-bg-secondary hover:bg-accent/5 border border-border px-3 py-1.5 rounded-lg transition-colors"
            >
              Insights
            </Link>
            <Link
              href={`/pages/${pageId}/settings`}
              className="text-xs font-medium text-text-secondary hover:text-accent bg-bg-secondary hover:bg-accent/5 border border-border px-3 py-1.5 rounded-lg transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      )}

      {/* Posts section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-text-primary">Recent Posts</h2>
        {/* Desktop create button */}
        <Link
          href={`/pages/${pageId}/posts/new`}
          className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-white bg-accent hover:bg-accent/90 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create post
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-bg-secondary border border-border rounded-xl p-1">
        <button
          onClick={() => {
            setActiveTab('published');
          }}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'published'
              ? 'bg-bg-card text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          Published
        </button>
        <button
          onClick={() => {
            if (activeTab !== 'scheduled') setScheduledRefreshKey(k => k + 1);
            setActiveTab('scheduled');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'scheduled'
              ? 'bg-bg-card text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Scheduled
          {scheduledState.status === 'success' && scheduledState.data.length > 0 && (
            <span className="bg-amber-400/20 text-amber-400 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {scheduledState.data.length}
            </span>
          )}
        </button>
      </div>

      {/* Scheduled posts tab */}
      {activeTab === 'scheduled' && (
        <>
          {scheduledState.status === 'loading' && (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-white/8 rounded w-4/5" />
                  <div className="h-3 bg-white/5 rounded w-2/5" />
                </div>
              ))}
            </div>
          )}
          {scheduledState.status === 'error' && (
            <ReauthError
              message={scheduledState.error}
              permissionHint="pages_manage_posts"
              onRetry={() => setScheduledRefreshKey(k => k + 1)}
            />
          )}
          {scheduledState.status === 'success' && scheduledState.data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary text-sm">No scheduled posts</p>
              <Link
                href={`/pages/${pageId}/posts/new`}
                className="inline-block mt-3 text-sm font-semibold text-accent hover:text-accent/80"
              >
                Schedule a post →
              </Link>
            </div>
          )}
          {scheduledState.status === 'success' && scheduledState.data.length > 0 && (
            <div className="space-y-3">
              {scheduledState.data.map(post => (
                <ScheduledPostCard
                  key={post.id}
                  post={post}
                  onEdit={handleEditScheduled}
                  onDelete={setDeleteScheduledId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Published posts tab */}
      {activeTab === 'published' && postsState.status === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse space-y-3">
              <div className="h-4 bg-white/8 rounded w-4/5" />
              <div className="h-4 bg-white/5 rounded w-3/5" />
              <div className="h-3 bg-white/5 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'published' && postsState.status === 'error' && (
        <ReauthError
          message={postsState.error}
          errorCode={postsState.errorCode}
          permissionHint="pages_read_user_content"
          onRetry={retryPosts}
        />
      )}

      {activeTab === 'published' && postsState.status === 'success' && postsState.data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-text-secondary text-sm">No posts yet</p>
          <Link
            href={`/pages/${pageId}/posts/new`}
            className="inline-block mt-3 text-sm font-semibold text-accent hover:text-accent/80"
          >
            Create your first post →
          </Link>
        </div>
      )}

      {activeTab === 'published' && postsState.status === 'success' && postsState.data.length > 0 && (
        <>
          <div className="space-y-3">
            {postsState.data.map(post => (
              <PostCard
                key={post.id}
                post={post}
                canManage
                onBoost={setBoostPost}
                onAnalyze={(post) => {
                  const p = new URLSearchParams({ pageName: page?.name ?? pageId });
                  if (page?.followers_count !== undefined) p.set('followersCount', String(page.followers_count));
                  if (page?.category) p.set('pageCategory', page.category);
                  router.push(`/pages/${pageId}/posts/${post.id}/analyze?${p}`);
                }}
                onComments={(post) => router.push(`/pages/${pageId}/posts/${post.id}/comments?pageName=${encodeURIComponent(page?.name ?? pageId)}`)}
                onDelete={setDeletePostId}
              />
            ))}
          </div>
          {hasMorePosts && (
            <button
              onClick={loadMorePosts}
              disabled={loadingMorePosts}
              className="mt-4 w-full py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-white/[0.03] disabled:opacity-50 transition-colors"
            >
              {loadingMorePosts ? 'Loading...' : 'Load more'}
            </button>
          )}
        </>
      )}

      {/* FAB — mobile create button */}
      <Link
        href={`/pages/${pageId}/posts/new`}
        className="sm:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-accent text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center hover:bg-accent/90 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>

      {/* Boost modal — lazy mount so useAdAccounts only fires when needed */}
      {boostPost && (
        <BoostModalContainer
          post={boostPost}
          pageId={pageId}
          pageBusiness={page?.business}
          token={auth.token ?? ''}
          onClose={() => setBoostPost(null)}
          onSuccess={() => toast('Post boosted successfully!', 'success')}
        />
      )}

      {/* Delete confirm — published post */}
      <ConfirmDialog
        open={!!deletePostId}
        title="Delete post?"
        description="This post will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletePostId(null)}
      />

      {/* Delete confirm — scheduled post */}
      <ConfirmDialog
        open={!!deleteScheduledId}
        title="Delete scheduled post?"
        description="This scheduled post will be cancelled and permanently deleted."
        confirmLabel="Delete"
        destructive
        loading={deletingScheduled}
        onConfirm={handleDeleteScheduled}
        onCancel={() => setDeleteScheduledId(null)}
      />

    </PageContainer>
  );
}
