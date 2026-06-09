"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FacebookLoginButton } from "@/components/facebook/FacebookLoginButton";
import { STORAGE_KEYS } from "@/lib/constants";
import { clearCookieValue, getCookieValue } from "@/lib/facebook-oauth";

export default function LoginPage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoading && state.token) {
      const returnTo =
        localStorage.getItem(STORAGE_KEYS.OAUTH_RETURN_TO) ??
        getCookieValue(STORAGE_KEYS.OAUTH_RETURN_TO);
      localStorage.removeItem(STORAGE_KEYS.OAUTH_RETURN_TO);
      clearCookieValue(STORAGE_KEYS.OAUTH_RETURN_TO);
      router.replace(returnTo?.startsWith("/") && returnTo !== "/login" ? returnTo : "/businesses");
    }
  }, [state.isLoading, state.token, router]);

  return (
    <main className="flex-1 flex items-center justify-center p-3 sm:p-8">
      <div className="w-full max-w-[430px]">
        <div className="meta-panel p-5 sm:p-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Logo"
              className="w-14 h-14 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Account connection
              </p>
              <h1 className="text-2xl font-bold text-text-primary leading-tight">
                Enter the cockpit
              </h1>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-text-secondary">
            Connect Facebook to bring ad accounts, campaigns, Pages, posts,
            insights, and AI analysis into one control surface.
          </p>

          <div className="mt-6">
            <FacebookLoginButton />
          </div>

          <div className="mt-5 rounded-lg border border-border bg-bg-secondary/60 p-4 text-left">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-3">
              Access requested
            </p>
            <ul className="space-y-2.5">
              {[
                "Read ad accounts, campaigns, and ad sets",
                "Update campaign status and budgets",
                "View and publish Page posts",
                "Read Page insights and performance signals",
                "Access Business portfolio assets",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent shrink-0" />
                  <span className="text-xs leading-5 text-text-secondary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
