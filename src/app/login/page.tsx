"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FacebookLoginButton } from "@/components/facebook/FacebookLoginButton";

export default function LoginPage() {
  const { state } = useAuth();
  const signedIn = !state.isLoading && Boolean(state.token);

  return (
    <main className="login-workspace login-simple">
      <div className="login-card-wrap">
        <section className="meta-panel login-card" aria-labelledby="login-title" data-signed-in={signedIn}>
          <header className="login-brand">
            <div className="login-brand-mark"><BrandLogo size={48} decorative /></div>
            <p className="login-greeting">{signedIn ? 'Welcome back' : 'Your advertising workspace'}</p>
            <h1 id="login-title">Meta Ads AI</h1>
          </header>
          <p className="login-description">
            Your ads. Clearer insights.<br />Smarter decisions with AI.
          </p>
          <div className="login-actions">
            {signedIn && <>
              <div className="login-session">
                <UserAvatar name={state.user?.name || 'Facebook user'} src={state.user?.picture?.data?.url} className="login-session-avatar" />
                <div className="login-session-copy">
                  <span>Signed in with Facebook</span>
                  <strong>{state.user?.name || 'Your Facebook account'}</strong>
                </div>
                <span className="login-session-check" aria-label="Signed in">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>
                </span>
              </div>
              <Link href="/accounts" className="mobile-action login-continue">
                Continue to workspace
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
              </Link>
            </>}
            <FacebookLoginButton className="login-facebook" />
          </div>
        </section>
      </div>
    </main>
  );
}
