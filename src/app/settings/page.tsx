"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { PageContainer } from "@/components/layout/PageContainer";
import { WorkspaceHero } from "@/components/layout/WorkspaceHero";
import { CopyButton } from "@/components/ui/CopyButton";

// ─── Email notification types ─────────────────────────────────────────────────

const REQUIRED_EMAIL_TYPES = [
  {
    id: "transactions",
    label: "Billing and spend alerts",
    freq: "instant",
    description:
      "Budget movement, payment events, and changes related to your ad accounts.",
  },
  {
    id: "performance",
    label: "Performance summaries",
    freq: "weekly",
    description:
      "Campaign result summaries, CPM, CTR, ROAS signals, and AI optimization notes.",
  },
  {
    id: "alerts",
    label: "Account attention alerts",
    freq: "instant",
    description:
      "Notifications when ads are rejected, budgets run low, or an account needs review.",
  },
] as const;

const EMAIL_FEATURES_KEY = "ads_email_features";

function loadFeaturesEmailPref(): boolean {
  try {
    return localStorage.getItem(EMAIL_FEATURES_KEY) !== "false";
  } catch {}
  return true;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// ─── Theme option button ───────────────────────────────────────────────────────

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "Auto", Icon: MonitorIcon },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [showToken, setShowToken] = useState(false);
  const [featuresEmail, setFeaturesEmail] = useState(true);

  useEffect(() => {
    setFeaturesEmail(loadFeaturesEmailPref());
  }, []);

  function toggleFeaturesEmail() {
    setFeaturesEmail((prev) => {
      localStorage.setItem(EMAIL_FEATURES_KEY, String(!prev));
      return !prev;
    });
  }

  useEffect(() => {
    if (!auth.isLoading && !auth.token) {
      router.replace("/login");
    }
  }, [auth.isLoading, auth.token, router]);

  if (auth.isLoading || !auth.token) return null;

  const { user, token } = auth;

  return (
    <PageContainer>
      <WorkspaceHero
        eyebrow="Workspace preferences"
        title="Control room settings"
        description="Manage identity, appearance, email preferences, and access token visibility for this browser session."
      />

      <div className="space-y-4">
        {/* Account Info */}
        {user && (
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
              Operator profile
            </p>

            <div className="flex items-center gap-4 mb-4">
              {user.picture?.data.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture.data.url}
                  alt={user.name}
                  className="w-16 h-16 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base font-semibold text-text-primary truncate">
                  {user.name}
                </p>
                {user.email && (
                  <p className="text-sm text-text-secondary truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2.5 border-t border-border pt-4">
              {user.email && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted flex-shrink-0">
                    Email
                  </span>
                  <span className="text-sm text-text-secondary truncate text-right">
                    {user.email}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-muted flex-shrink-0">
                  Facebook ID
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-sm text-text-secondary truncate">
                    {user.id}
                  </span>
                  <CopyButton value={user.id} className="flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Appearance card */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
              Interface mode
            </p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`
                      flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all
                      ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-text-muted hover:bg-bg-secondary hover:text-text-secondary"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Notifications card */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-1">
              Email routing
            </p>
            <p className="text-xs text-text-muted mb-4">
              Choose which operational emails should reach your inbox.
            </p>

            <div className="space-y-4">
              {/* Required items — checkbox mờ, text bình thường */}
              {REQUIRED_EMAIL_TYPES.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded border-2 bg-accent/40 border-accent/40 flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-text-primary leading-snug">
                      {item.label}{" "}
                      <span className="font-normal text-text-muted">({item.freq})</span>
                    </span>
                    <span className="block text-xs text-text-secondary mt-0.5 leading-relaxed">
                      {item.description}
                    </span>
                  </span>
                </div>
              ))}

              <div className="border-t border-border" />

              {/* Optional — features */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <span className="relative flex-shrink-0 mt-0.5">
                  <input type="checkbox" checked={featuresEmail} onChange={toggleFeaturesEmail} className="sr-only" />
                  <span className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                    featuresEmail ? "bg-accent border-accent" : "bg-transparent border-border group-hover:border-accent/60"
                  }`}>
                    {featuresEmail && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-text-primary leading-snug">
                    Product updates and field notes{" "}
                    <span className="font-normal text-text-muted">(monthly)</span>
                  </span>
                  <span className="block text-xs text-text-secondary mt-0.5 leading-relaxed">
                    Updates on new workspace features, ad strategy notes, and Meta Ads changes.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {/* Access Token card */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest min-w-0">
                Graph API token
              </p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setShowToken((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-bg-secondary"
                >
                  {showToken ? (
                    <>
                      <EyeOffIcon className="w-3.5 h-3.5" />
                      Hide
                    </>
                  ) : (
                    <>
                      <EyeIcon className="w-3.5 h-3.5" />
                      Show
                    </>
                  )}
                </button>
                <CopyButton value={token} />
              </div>
            </div>

            <div className="bg-bg-secondary rounded-xl px-3 py-2.5">
              {showToken ? (
                <p className="font-mono text-xs text-text-secondary break-all leading-relaxed select-all">
                  {token}
                </p>
              ) : (
                <p className="font-mono text-sm text-text-muted tracking-wide truncate">
                  {token.substring(0, 12)}&thinsp;{"•".repeat(8)}
                </p>
              )}
            </div>

            <p className="mt-3 text-xs text-text-muted leading-snug">
              This token authenticates requests to the Facebook Graph API. Keep it private.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
