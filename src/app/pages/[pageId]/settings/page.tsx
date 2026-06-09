'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageToken } from '@/hooks/usePageToken';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ErrorState } from '@/components/ui/ErrorState';
import { getPageInfo, updatePageInfo, updatePagePicture } from '@/lib/api/pageSettings';
import { useToast } from '@/components/ui/Toaster';
import type { PageInfo, AsyncState } from '@/lib/types';

function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div className="glass-card gradient-border-card rounded-2xl p-4">
      <label className="text-xs text-text-muted uppercase tracking-wide mb-2 block">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-text-muted mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-status-red mt-1.5">{error}</p>}
    </div>
  );
}

export default function PageSettingsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ pageId: string }>();
  const { pageId } = params;
  const { toast } = useToast();
  const pageToken = usePageToken(pageId, auth.token);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [infoState, setInfoState] = useState<AsyncState<PageInfo>>({ status: 'idle' });
  const [about, setAbout] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/login');
  }, [auth.isLoading, auth.token, router]);

  const loadInfo = useCallback(async () => {
    if (!pageToken) return;
    setInfoState({ status: 'loading' });
    try {
      const data = await getPageInfo(pageId, pageToken);
      setInfoState({ status: 'success', data });
      setAbout(data.about ?? '');
      setDescription(data.description ?? '');
      setWebsite(data.website ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.emails?.[0] ?? '');
      setDirty(false);
    } catch (err) {
      setInfoState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load page info' });
    }
  }, [pageId, pageToken]);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  function validate() {
    const errs: Record<string, string> = {};
    if (website && !/^https?:\/\/.+/.test(website)) {
      errs.website = 'URL must start with http:// or https://';
    }
    if (phone && !/^[+\d\s\-()]{7,20}$/.test(phone)) {
      errs.phone = 'Invalid phone number';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Invalid email address';
    }
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!pageToken) return;
    setSaving(true);
    try {
      await updatePageInfo(pageId, { about, description, website, phone, email }, pageToken);
      toast('Page info saved', 'success');
      setDirty(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleChange(setter: (v: string) => void, field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setDirty(true);
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    };
  }

  function handlePictureSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  }

  async function handleUploadPicture() {
    if (!pictureFile || !pageToken) return;
    setUploadingPicture(true);
    try {
      await updatePagePicture(pageId, pictureFile, pageToken);
      toast('Profile photo updated', 'success');
      setPictureFile(null);
      setPicturePreview(null);
      loadInfo();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update photo', 'error');
    } finally {
      setUploadingPicture(false);
    }
  }

  function cancelPictureChange() {
    setPictureFile(null);
    setPicturePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const info = infoState.status === 'success' ? infoState.data : null;
  const currentPicture = picturePreview ?? info?.picture?.data.url ?? null;

  return (
    <PageContainer>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <Breadcrumb
            items={[
              { label: 'Pages', href: '/pages' },
              { label: info?.name ?? pageId, href: `/pages/${pageId}` },
              { label: 'Settings' },
            ]}
          />
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">Page Settings</h1>
        </div>
        {dirty && (
          <span className="text-xs font-medium text-status-yellow bg-status-yellow/10 border border-status-yellow/20 px-2.5 py-1 rounded-full mt-3 flex-shrink-0">
            Unsaved changes
          </span>
        )}
      </div>

      {infoState.status === 'loading' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
          <div className="space-y-4">
            <div className="glass-card gradient-border-card rounded-2xl p-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/8 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/8 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-1/4" />
              </div>
            </div>
            <div className="glass-card gradient-border-card rounded-2xl aspect-[2.7/1] bg-white/5" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card gradient-border-card rounded-2xl p-4">
                <div className="h-3 bg-white/5 rounded w-1/4 mb-3" />
                <div className="h-9 bg-white/8 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {infoState.status === 'error' && (
        <ErrorState message={infoState.error} onRetry={loadInfo} />
      )}

      {infoState.status === 'success' && info && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

          {/* Left column: Profile + Cover */}
          <div className="space-y-4">

            {/* Profile picture + basic info */}
            <div className="glass-card gradient-border-card rounded-2xl p-4">
              <label className="text-xs text-text-muted uppercase tracking-wide mb-3 block">Profile photo</label>
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {currentPicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentPicture} alt={info.name} className="w-20 h-20 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center text-accent font-bold text-3xl">
                      {info.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {picturePreview && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-status-yellow border-2 border-bg-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">{info.name}</p>
                  {info.category && <p className="text-xs text-text-muted mt-0.5">{info.category}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
                    {info.fan_count !== undefined && <span>{info.fan_count.toLocaleString()} likes</span>}
                    {info.followers_count !== undefined && <span>{info.followers_count.toLocaleString()} followers</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePictureSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors min-h-[36px]"
                >
                  Choose new photo
                </button>
                {pictureFile && (
                  <>
                    <button
                      onClick={handleUploadPicture}
                      disabled={uploadingPicture}
                      className="text-xs font-semibold px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[36px]"
                    >
                      {uploadingPicture ? 'Uploading...' : 'Save photo'}
                    </button>
                    <button
                      onClick={cancelPictureChange}
                      className="text-xs px-3 py-2 text-text-muted hover:text-text-secondary transition-colors min-h-[36px]"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-text-muted mt-2">JPG, PNG or WEBP. Max 4MB.</p>
            </div>

            {/* Cover photo */}
            {info.cover?.source && (
              <div className="glass-card gradient-border-card rounded-2xl overflow-hidden">
                <div className="px-4 pt-4">
                  <label className="text-xs text-text-muted uppercase tracking-wide block mb-2">Cover photo</label>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.cover.source} alt="Cover" className="w-full aspect-[2.7/1] object-cover" />
              </div>
            )}

          </div>

          {/* Right column: Form fields */}
          <div className="space-y-4">

            <Field label="Short description (About)" hint="Displayed at the top of your Facebook Page">
              <textarea
                value={about}
                onChange={handleChange(setAbout, 'about')}
                rows={3}
                maxLength={255}
                placeholder="Brief description of your page..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none"
              />
              <p className="text-xs text-text-muted text-right mt-1">{about.length}/255</p>
            </Field>

            <Field label="Full description" hint="More detailed information about your page">
              <textarea
                value={description}
                onChange={handleChange(setDescription, 'description')}
                rows={4}
                placeholder="Detailed description of your page..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none"
              />
            </Field>

            <Field label="Website" error={errors.website}>
              <input
                type="url"
                value={website}
                onChange={handleChange(setWebsite, 'website')}
                placeholder="https://example.com"
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </Field>

            <Field label="Phone number" error={errors.phone}>
              <input
                type="tel"
                value={phone}
                onChange={handleChange(setPhone, 'phone')}
                placeholder="+84 xxx xxx xxx"
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </Field>

            <Field label="Contact email" error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={handleChange(setEmail, 'email')}
                placeholder="contact@example.com"
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </Field>

            {/* Save button — inline on desktop, fixed bottom on mobile */}
            <div className="lg:flex lg:justify-end fixed bottom-0 left-0 right-0 lg:static bg-bg-secondary lg:bg-transparent border-t border-border lg:border-0 p-4 lg:p-0">
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="w-full lg:w-auto px-6 py-3 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>

          </div>
        </div>
      )}
    </PageContainer>
  );
}
