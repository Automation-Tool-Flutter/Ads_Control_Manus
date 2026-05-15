'use client';

import type { PagePost } from '@/lib/types';

interface ScheduledPostCardProps {
  post: PagePost;
  onEdit?: (post: PagePost) => void;
  onDelete?: (postId: string) => void;
}

function formatScheduledTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ScheduledPostCard({ post, onEdit, onDelete }: ScheduledPostCardProps) {
  const text = post.message || post.story || '';

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      {post.full_picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.full_picture} alt="Post" className="aspect-video w-full object-cover" />
      )}

      <div className="p-4">
        {text && <p className="text-sm text-text-primary line-clamp-3 mb-3">{text}</p>}

        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-amber-400 font-medium">
            {post.scheduled_publish_time
              ? formatScheduledTime(post.scheduled_publish_time)
              : 'Scheduled'}
          </span>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <>
          <div className="mx-4 border-t border-border/50" />
          <div className="flex">
            {onEdit && (
              <button
                onClick={() => onEdit(post)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-text-secondary text-sm hover:bg-white/[0.03] active:bg-white/5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
                Edit
              </button>
            )}
            {onEdit && onDelete && <div className="w-px bg-border/50" />}
            {onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 text-status-red text-sm hover:bg-status-red/5 active:bg-status-red/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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
