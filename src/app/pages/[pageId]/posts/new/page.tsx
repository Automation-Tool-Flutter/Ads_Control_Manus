'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageToken } from '@/hooks/usePageToken';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { createPagePost, createPagePostWithPhotos } from '@/lib/api/pagePostMutations';
import { cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import { useToast } from '@/components/ui/Toaster';

const MAX_CHARS = 63206;
const MAX_IMAGES = 10;
const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp';

type Tone = 'casual' | 'professional' | 'promotional';

export default function NewPostPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ pageId: string }>();
  const { pageId } = params;
  const { toast } = useToast();
  const pageToken = usePageToken(pageId, auth.token);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // AI suggestion state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<Tone>('casual');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiError, setAiError] = useState('');

  const todayDate = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0, 5);
  const maxScheduleDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
  }, [auth.isLoading, auth.token, router]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => { previews.forEach(URL.revokeObjectURL); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = MAX_CHARS - message.length;
  const isNearLimit = remaining < 500;
  const isOverLimit = remaining < 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    addImages(files);
    e.target.value = '';
  }

  function addImages(files: File[]) {
    const allowed = files.slice(0, MAX_IMAGES - images.length);
    const newPreviews = allowed.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...allowed]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!message.trim() && images.length === 0) || !pageToken || isOverLimit) return;
    setLoading(true);
    setError('');
    try {
      let scheduledUnix: string | undefined;
      if (scheduled && scheduledDate && scheduledTime) {
        const scheduledMs = new Date(`${scheduledDate}T${scheduledTime}`).getTime();
        const minMs = Date.now() + 10 * 60 * 1000;
        const maxMs = Date.now() + 180 * 24 * 60 * 60 * 1000;
        if (scheduledMs < minMs) {
          setError('Scheduled time must be at least 10 minutes from now.');
          setLoading(false);
          return;
        }
        if (scheduledMs > maxMs) {
          setError('Scheduled time cannot be more than 6 months from now.');
          setLoading(false);
          return;
        }
        scheduledUnix = String(Math.floor(scheduledMs / 1000));
      }

      if (images.length > 0) {
        await createPagePostWithPhotos(pageId, message, images, pageToken, scheduledUnix);
      } else {
        await createPagePost(pageId, message, pageToken, scheduledUnix);
      }
      toast(scheduled ? 'Post scheduled successfully' : 'Post published!', 'success');
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${pageId}/posts`);
      if (scheduled) {
        cacheInvalidatePrefix(`${GRAPH_API_BASE}/${pageId}/scheduled_posts`);
        router.push(`/pages/${pageId}?tab=scheduled`);
      } else {
        router.push(`/pages/${pageId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  }

  async function handleAiSuggest() {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/post-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, tone: aiTone, language: 'en' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get suggestions');
      setAiSuggestions(data.suggestions ?? []);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="max-w-2xl mx-auto">
        <div className="mb-5">
          <Breadcrumb
            items={[
              { label: 'Pages', href: '/pages' },
              { label: pageId, href: `/pages/${pageId}` },
              { label: 'New post' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">Create new post</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Message textarea */}
          <div className="glass-card gradient-border-card rounded-2xl p-4">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={6}
              className="w-full min-h-[140px] bg-transparent text-sm sm:text-base text-text-primary placeholder:text-text-muted resize-none focus:outline-none"
            />

            {/* Image previews */}
            {previews.length > 0 && (
              <div className={`grid gap-2 mt-3 ${previews.length === 1 ? 'grid-cols-1' : previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1">
                {/* Add photo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= MAX_IMAGES}
                  title="Add photo"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  Photo
                  {images.length > 0 && <span className="text-accent font-medium">({images.length})</span>}
                </button>
                {/* AI write button */}
                <button
                  type="button"
                  onClick={() => { setAiOpen(v => !v); setAiError(''); }}
                  title="AI Write"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${aiOpen ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                  AI Write
                </button>
              </div>
              <span className={`text-xs ${isOverLimit ? 'text-status-red' : isNearLimit ? 'text-status-yellow' : 'text-text-muted'}`}>
                {remaining.toLocaleString('en-US')}
              </span>
            </div>

            {/* AI Suggestion Panel */}
            {aiOpen && (
              <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAiSuggest(); } }}
                    placeholder="Topic or keywords..."
                    className="flex-1 px-3 py-2 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {([
                    { value: 'casual', label: 'Casual' },
                    { value: 'professional', label: 'Professional' },
                    { value: 'promotional', label: 'Promotional' },
                  ] as { value: Tone; label: string }[]).map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAiTone(t.value)}
                      className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${aiTone === t.value ? 'bg-accent text-white border-accent' : 'border-border text-text-secondary hover:text-text-primary hover:border-border/80'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={aiLoading || !aiTopic.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Generating...
                    </>
                  ) : 'Suggest'}
                </button>

                {aiError && (
                  <p className="text-xs text-status-red bg-status-red/10 rounded-xl px-3 py-2">{aiError}</p>
                )}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-2">
                    {aiSuggestions.map((s, i) => (
                      <div key={i} className="bg-bg-secondary border border-border rounded-xl p-3 space-y-2">
                        <p className="text-xs text-text-secondary font-medium">Suggestion {i + 1}</p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{s}</p>
                        <button
                          type="button"
                          onClick={() => { setMessage(s); setAiOpen(false); }}
                          className="text-xs px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                        >
                          Use this
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule toggle */}
          <div className="glass-card gradient-border-card rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Schedule post</p>
                <p className="text-xs text-text-muted">Set a date and time to publish automatically</p>
              </div>
              <button
                type="button"
                onClick={() => setScheduled(v => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  scheduled ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  scheduled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {scheduled && (
              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={todayDate}
                    max={maxScheduleDate}
                    className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-1 focus:ring-accent appearance-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Time</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    min={scheduledDate === todayDate ? nowTime : undefined}
                    className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-1 focus:ring-accent appearance-none min-h-[44px]"
                  />
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-status-red bg-status-red/10 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Submit — sticky on mobile */}
          <div className="sm:static fixed bottom-0 left-0 right-0 sm:relative bg-bg-secondary sm:bg-transparent border-t border-border sm:border-0 p-4 sm:p-0">
            <button
              type="submit"
              disabled={loading || (!message.trim() && images.length === 0) || isOverLimit || (scheduled && (!scheduledDate || !scheduledTime))}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Publishing...' : scheduled ? 'Schedule post' : 'Publish now'}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
