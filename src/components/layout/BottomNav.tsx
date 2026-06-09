"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const APP_NAV = [
  { href: "/businesses", label: "Assets", icon: AssetsIcon },
  { href: "/accounts", label: "Ads", icon: AdsIcon },
  { href: "/pages", label: "Content", icon: ContentIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { state } = useAuth();

  if (!state.user || !APP_NAV.some((item) => item.href === pathname)) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-card px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_28px_rgba(15,23,42,0.16)] sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {APP_NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-bold transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center ${active ? "text-accent" : "text-text-muted"}`}>
                <Icon />
              </span>
              <span className="truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AssetsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.75 7h2m-2 4h2m2.5-4h2m-2 4h2M9 21v-3.25c0-.69.56-1.25 1.25-1.25h3.5c.69 0 1.25.56 1.25 1.25V21" />
    </svg>
  );
}

function AdsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V8M3 19.5h18" />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.75h12A2.25 2.25 0 0120.25 7v10A2.25 2.25 0 0118 19.25H6A2.25 2.25 0 013.75 17V7A2.25 2.25 0 016 4.75zM7.75 9h8.5M7.75 12h5.5M7.75 15h7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.5h3m-6.8 3.4 2.1-2.1m8.4 0 2.1 2.1M5.75 12h3m6.5 0h3m-9.45 4.2-2.1-2.1m12.6 0-2.1 2.1M10.5 17.5h3M12 14.25A2.25 2.25 0 1012 9.75a2.25 2.25 0 000 4.5z" />
    </svg>
  );
}
