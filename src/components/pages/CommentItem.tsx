"use client";

import { useState } from "react";
import type { PageComment } from "@/lib/types";

interface CommentItemProps {
  comment: PageComment;
  onReply: (commentId: string, message: string) => Promise<void>;
  onHide: (commentId: string, isHidden: boolean) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string, liked: boolean) => Promise<void>;
  isHidden?: boolean;
}

function CommentAvatar({
  from,
}: {
  from?: { id: string; name: string };
}) {
  const avatarUrl = from?.id
    ? `https://graph.facebook.com/${from.id}/picture?type=square&width=50`
    : null;
  const initial = from?.name?.charAt(0).toUpperCase() ?? "?";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={from?.name ?? ""}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-accent/20"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          el.nextElementSibling?.removeAttribute("hidden");
        }}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
      {initial}
    </div>
  );
}

function ReplyLikeButton({
  reply,
  onLike,
}: {
  reply: PageComment;
  onLike: (commentId: string, liked: boolean) => Promise<void>;
}) {
  const [liked, setLiked] = useState(reply.user_likes ?? false);
  const [likeCount, setLikeCount] = useState(reply.like_count ?? 0);
  const [loading, setLoading] = useState(false);

  async function handleLike() {
    if (loading) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
    setLoading(true);
    try {
      await onLike(reply.id, newLiked);
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => (newLiked ? Math.max(0, c - 1) : c + 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
        liked ? "text-status-red" : "text-text-muted hover:text-status-red"
      }`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill={liked ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  );
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommentItem({
  comment,
  onReply,
  onHide,
  onDelete,
  onLike,
  isHidden,
}: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [replyToReplyId, setReplyToReplyId] = useState<string | null>(null);
  const [replyToReplyText, setReplyToReplyText] = useState("");
  const [replyToReplyLoading, setReplyToReplyLoading] = useState(false);
  const [liked, setLiked] = useState(comment.user_likes ?? false);
  const [likeCount, setLikeCount] = useState(comment.like_count ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);

  async function handleReply() {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText("");
      setReplyOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleHide() {
    setLoading(true);
    try {
      await onHide(comment.id, !isHidden);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await onDelete(comment.id);
    } finally {
      setLoading(false);
    }
  }

  async function handleLike() {
    if (likeLoading) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : Math.max(0, c - 1)));
    setLikeLoading(true);
    try {
      await onLike(comment.id, newLiked);
    } catch {
      // revert on error
      setLiked(!newLiked);
      setLikeCount((c) => (newLiked ? Math.max(0, c - 1) : c + 1));
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleReplyToReply(replyId: string) {
    if (!replyToReplyText.trim()) return;
    setReplyToReplyLoading(true);
    try {
      await onReply(replyId, replyToReplyText);
      setReplyToReplyText("");
      setReplyToReplyId(null);
    } finally {
      setReplyToReplyLoading(false);
    }
  }

  return (
    <div className={`py-3 ${isHidden ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <CommentAvatar from={comment.from} />

        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-text-primary">
                {comment.from?.name ?? "Unknown"}
              </span>
              <span className="ml-2 text-xs text-text-muted">
                {formatTime(comment.created_time)}
              </span>
              {isHidden && (
                <span className="ml-2 text-xs text-text-muted italic">
                  Hidden
                </span>
              )}
              <p className="text-sm text-text-secondary mt-1 break-words">
                {comment.message}
              </p>
              {/* Action row: like + reply + hide + delete */}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${
                    liked
                      ? "text-status-red"
                      : "text-text-muted hover:text-status-red"
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill={liked ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                  {likeCount > 0 && <span>{likeCount}</span>}
                </button>

                <button
                  onClick={() => setReplyOpen((v) => !v)}
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                >
                  Reply
                </button>

                {comment.can_hide !== false && (
                  <button
                    onClick={handleHide}
                    disabled={loading}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
                  >
                    {isHidden ? "Unhide" : "Hide"}
                  </button>
                )}

                {comment.can_remove !== false && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-xs text-status-red hover:text-status-red/70 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
          </div>

          {/* Replies (level 2) */}
          {comment.comments && comment.comments.data.length > 0 && (
            <div className="mt-2 ml-4 space-y-3 border-l-2 border-border/40 pl-3">
              {comment.comments.data.map(reply => (
                <div key={reply.id}>
                  <div className="flex items-start gap-2">
                    <CommentAvatar from={reply.from} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-text-primary">
                        {reply.from?.name ?? "Unknown"}
                      </span>
                      <span className="ml-2 text-xs text-text-muted">
                        {formatTime(reply.created_time)}
                      </span>
                      <p className="text-sm text-text-secondary mt-0.5 break-words">{reply.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <ReplyLikeButton reply={reply} onLike={onLike} />
                        <button
                          onClick={() => setReplyToReplyId(v => v === reply.id ? null : reply.id)}
                          className="text-xs text-text-muted hover:text-accent transition-colors"
                        >
                          Reply
                        </button>
                        {reply.can_remove !== false && (
                          <button
                            onClick={() => onDelete(reply.id)}
                            className="text-xs text-status-red hover:text-status-red/70 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      {replyToReplyId === reply.id && (
                        <div className="mt-1.5 flex items-end gap-2">
                          <textarea
                            value={replyToReplyText}
                            onChange={(e) => setReplyToReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            rows={2}
                            className="flex-1 px-3 py-2 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleReplyToReply(reply.id)}
                              disabled={replyToReplyLoading || !replyToReplyText.trim()}
                              className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg disabled:opacity-50 transition-colors"
                            >
                              {replyToReplyLoading ? "..." : "Send"}
                            </button>
                            <button
                              onClick={() => setReplyToReplyId(null)}
                              className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replies (level 3) — Delete only */}
                  {reply.comments && reply.comments.data.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2 border-l-2 border-border/30 pl-3">
                      {reply.comments.data.map(r3 => (
                        <div key={r3.id} className="flex items-start gap-2">
                          <CommentAvatar from={r3.from} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-text-primary">
                              {r3.from?.name ?? "Unknown"}
                            </span>
                            <span className="ml-2 text-xs text-text-muted">
                              {formatTime(r3.created_time)}
                            </span>
                            <p className="text-sm text-text-secondary mt-0.5 break-words">{r3.message}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <ReplyLikeButton reply={r3} onLike={onLike} />
                              {r3.can_remove !== false && (
                                <button
                                  onClick={() => onDelete(r3.id)}
                                  className="text-xs text-status-red hover:text-status-red/70 transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reply box */}
          {replyOpen && (
            <div className="mt-2 flex items-end gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="flex-1 px-3 py-2 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={handleReply}
                  disabled={loading || !replyText.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loading ? "..." : "Send"}
                </button>
                <button
                  onClick={() => setReplyOpen(false)}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
