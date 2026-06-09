"use client";

import type { PagePost } from "@/lib/types";
import { NON_DELETABLE_STATUS_TYPES } from "@/lib/types";

interface PostCardProps {
  post: PagePost;
  canManage?: boolean;
  onEdit?: (post: PagePost) => void;
  onDelete?: (postId: string) => void;
  onBoost?: (post: PagePost) => void;
  onAnalyze?: (post: PagePost) => void;
  onComments?: (post: PagePost) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("vi-VN");
}

export function PostCard({
  post,
  canManage,
  onEdit,
  onDelete,
  onBoost,
  onAnalyze,
  onComments,
}: PostCardProps) {
  const text = post.message || post.story || "";
  const reactions =
    post.reactions?.summary.total_count ?? post.likes?.summary.total_count ?? 0;
  const comments = post.comments?.summary.total_count ?? 0;
  const shares = post.shares?.count ?? 0;
  const canDelete =
    !!onDelete && !NON_DELETABLE_STATUS_TYPES.has(post.status_type ?? "");
  const hasActions =
    canManage && (onBoost || onAnalyze || onComments || onEdit || canDelete);

  return (
    <div className="meta-item">
      {/* Image */}
      {post.full_picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.full_picture}
          alt="Post"
          className="aspect-video w-full border-b border-border object-cover"
        />
      )}

      <div className="meta-item-header flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-accent">Page post</p>
          <p className="mt-0.5 text-xs font-semibold text-text-muted">
            {formatRelativeTime(post.created_time)}
          </p>
        </div>
        {post.permalink_url && (
          <a
            href={post.permalink_url}
            target="_blank"
            rel="noopener noreferrer"
            className="meta-action meta-action-secondary min-h-8 px-2.5 py-1 text-xs"
          >
            View
          </a>
        )}
      </div>

      <div className="p-4">
        {/* Text */}
        {text && (
          <p className="mb-3 line-clamp-3 text-sm leading-6 text-text-primary">{text}</p>
        )}

        {/* Engagement bar */}
        <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3">
          <span className="meta-metric flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase text-text-muted">Reactions</span>
            <span className="text-sm font-black text-text-primary tabular-nums">{reactions.toLocaleString()}</span>
          </span>
          <span className="meta-metric flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase text-text-muted">Comments</span>
            <span className="text-sm font-black text-text-primary tabular-nums">{comments.toLocaleString()}</span>
          </span>
          <span className="meta-metric flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase text-text-muted">Shares</span>
            <span className="text-sm font-black text-text-primary tabular-nums">{shares.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Action bar */}
      {hasActions && (
        <>
          <div className="border-t border-border" />
          <div className="grid grid-cols-2 divide-x divide-border sm:flex sm:divide-x">
            {onBoost && (
              <button
                onClick={() => onBoost(post)}
                className="meta-action flex-1 rounded-none text-accent hover:bg-accent/5 active:bg-accent/10"
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
                    d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                  />
                </svg>
                Boost
              </button>
            )}
            {onBoost && (onAnalyze || onComments || onEdit || canDelete) && (
              <div className="hidden" />
            )}
            {onAnalyze && (
              <button
                onClick={() => onAnalyze(post)}
                className="meta-action flex-1 rounded-none text-text-secondary hover:bg-bg-secondary active:bg-bg-secondary"
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
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
                Analyze
              </button>
            )}
            {onAnalyze && (onComments || onEdit || canDelete) && (
              <div className="hidden" />
            )}
            {onComments && (
              <button
                onClick={() => onComments(post)}
                className="meta-action flex-1 rounded-none text-text-secondary hover:bg-bg-secondary active:bg-bg-secondary"
              >
                Comments
              </button>
            )}
            {onComments && (onEdit || canDelete) && (
              <div className="hidden" />
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(post)}
                className="meta-action flex-1 rounded-none text-text-secondary hover:bg-bg-secondary active:bg-bg-secondary"
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"
                  />
                </svg>
                Edit
              </button>
            )}
            {onEdit && canDelete && <div className="hidden" />}
            {canDelete && (
              <button
                onClick={() => onDelete!(post.id)}
                className="meta-action flex-1 rounded-none text-status-red hover:bg-status-red/5 active:bg-status-red/10"
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
                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  />
                </svg>
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
