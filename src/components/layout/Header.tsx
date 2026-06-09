"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toaster";

const APP_NAV = [
  { href: "/businesses", label: "Assets", detail: "Business, pages, catalogs", icon: "assets" },
  { href: "/accounts", label: "Ads", detail: "Accounts and campaigns", icon: "ads" },
  { href: "/pages", label: "Content", detail: "Publishing workspace", icon: "content" },
  { href: "/settings", label: "Settings", detail: "Access and controls", icon: "settings" },
] as const;

const PUBLIC_NAV = [
  { href: "/", label: "Overview", detail: "Product overview", icon: "overview" },
  { href: "/terms", label: "Terms", detail: "Service terms", icon: "terms" },
  { href: "/privacy", label: "Privacy", detail: "Data policy", icon: "privacy" },
  { href: "/contact", label: "Contact", detail: "Support", icon: "contact" },
] as const;

const APP_NAV_PATHS = new Set<string>(APP_NAV.map((item) => item.href));

export function Header() {
  const { state, logout } = useAuth();
  const { user } = state;
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navItems = user ? APP_NAV : PUBLIC_NAV;
  const mobileContext = user ? getMobileContext(pathname) : null;
  const showPublicHomeNav = Boolean(!user && pathname === "/");
  const showAppNav = Boolean(user && APP_NAV_PATHS.has(pathname));
  const showMobileChildAppBar = Boolean(user && mobileContext);
  const showDesktopShellNav = showPublicHomeNav || showAppNav;
  const showShellNav = showDesktopShellNav || showMobileChildAppBar;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    toast("Signed out", "info");
    router.push("/");
  }

  function handleMobileBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(mobileContext?.backHref ?? "/businesses");
  }

  if (!showShellNav) {
    return null;
  }

  return (
    <>
      {showDesktopShellNav && (
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-border bg-bg-card sm:flex sm:flex-col">
        <div className="flex h-[72px] items-center gap-3 border-b border-border px-4">
          <Brand href={user ? "/businesses" : "/"} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-text-primary">Ads Control</p>
            <p className="truncate text-xs font-semibold text-text-muted">Meta Ads with GPT</p>
          </div>
        </div>

        <div className="border-b border-border px-4 py-3">
          <div className="meta-panel-muted px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-text-muted">Workspace</span>
              <span className="h-2 w-2 rounded-full bg-status-green" />
            </div>
            <p className="mt-1 truncate text-sm font-bold text-text-primary">
              {user ? "Connected Meta session" : "Public preview"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[58px] items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                }`}
              >
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/16" : "bg-bg-secondary"}`}>
                  <NavIcon name={item.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className={`block truncate text-xs ${active ? "text-white/78" : "text-text-muted"}`}>
                    {item.detail}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          {user && (
            <div className="mb-3 meta-panel-muted p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/12 text-xs font-black text-accent">
                  GPT
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black uppercase text-text-primary">AI assistant layer</p>
                  <p className="truncate text-xs text-text-muted">Optimization ready</p>
                </div>
              </div>
            </div>
          )}
          {!user && pathname !== "/login" ? (
            <Link
              href="/login"
              className="flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-bold text-white"
            >
              Sign in with Meta
            </Link>
          ) : user ? (
            <UserMenu
              open={open}
              setOpen={setOpen}
              user={user}
              dropdownRef={dropdownRef}
              onLogout={handleLogout}
              placement="right"
            />
          ) : null}
        </div>
      </aside>
      )}

      <header className="sticky top-0 z-40 border-b border-border bg-bg-card px-3 py-2 shadow-sm sm:hidden">
        <div className="flex h-12 items-center justify-between gap-3">
          {mobileContext ? (
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={handleMobileBack}
                className="mobile-action inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-card text-text-secondary"
                aria-label="Back"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase text-accent">{mobileContext.section}</p>
                <p className="mt-0.5 truncate text-sm font-black text-text-primary">{mobileContext.title}</p>
              </div>
            </div>
          ) : (
            <MobileBrand href={user ? "/businesses" : "/"} />
          )}
          {!user && pathname !== "/login" && (
            <Link href="/login" className="mobile-action inline-flex items-center bg-accent px-3 text-sm font-bold text-white">
              Sign in
            </Link>
          )}
          {user && (
            <UserMenu
              open={open}
              setOpen={setOpen}
              user={user}
              dropdownRef={dropdownRef}
              onLogout={handleLogout}
              placement="bottom"
            />
          )}
        </div>
      </header>
    </>
  );
}

function getMobileContext(pathname: string) {
  if (pathname === "/businesses" || pathname === "/accounts" || pathname === "/pages" || pathname === "/settings") {
    return null;
  }
  const segments = pathname.split("/").filter(Boolean);

  if (pathname.startsWith("/businesses/")) {
    return { section: "Assets", title: "Business workspace", backHref: "/businesses" };
  }
  if (pathname.startsWith("/accounts/")) {
    const accountHref = segments[1] ? `/accounts/${segments[1]}` : "/accounts";
    if (pathname.includes("/optimize")) return { section: "Ads", title: "GPT optimization", backHref: accountHref };
    if (pathname.includes("/adsets/") && segments[5]) {
      return { section: "Ads", title: "Ad set workspace", backHref: `/accounts/${segments[1]}/campaigns/${segments[3]}/adsets` };
    }
    if (pathname.includes("/adsets")) {
      return { section: "Ads", title: "Ad set workspace", backHref: `/accounts/${segments[1]}/campaigns/${segments[3]}` };
    }
    if (pathname.includes("/campaigns/") && segments[3]) {
      return { section: "Ads", title: "Campaign workspace", backHref: `/accounts/${segments[1]}/campaigns` };
    }
    if (pathname.includes("/campaigns")) return { section: "Ads", title: "Campaign workspace", backHref: accountHref };
    if (pathname.includes("/catalogs/") && segments[3]) {
      return { section: "Ads", title: "Catalog workspace", backHref: `${accountHref}/catalogs` };
    }
    if (pathname.includes("/catalogs")) return { section: "Ads", title: "Catalog workspace", backHref: accountHref };
    return { section: "Ads", title: "Account workspace", backHref: "/accounts" };
  }
  if (pathname.startsWith("/pages/")) {
    const pageHref = segments[1] ? `/pages/${segments[1]}` : "/pages";
    if (pathname.includes("/posts/new")) return { section: "Content", title: "New post", backHref: pageHref };
    if (pathname.includes("/posts/")) return { section: "Content", title: "Post workspace", backHref: pageHref };
    if (pathname.includes("/insights")) return { section: "Content", title: "Page insights", backHref: pageHref };
    if (pathname.includes("/settings")) return { section: "Content", title: "Page settings", backHref: pageHref };
    return { section: "Content", title: "Page workspace", backHref: "/pages" };
  }
  return null;
}

function NavIcon({
  name,
}: {
  name: (typeof APP_NAV | typeof PUBLIC_NAV)[number]["icon"];
}) {
  const common = "h-5 w-5";
  if (name === "assets") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.75 7h2m-2 4h2m2.5-4h2m-2 4h2M9 21v-3.25c0-.69.56-1.25 1.25-1.25h3.5c.69 0 1.25.56 1.25 1.25V21" />
      </svg>
    );
  }
  if (name === "ads") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V8M3 19.5h18" />
      </svg>
    );
  }
  if (name === "content") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.75h12A2.25 2.25 0 0120.25 7v10A2.25 2.25 0 0118 19.25H6A2.25 2.25 0 013.75 17V7A2.25 2.25 0 016 4.75zM7.75 9h8.5M7.75 12h5.5M7.75 15h7" />
      </svg>
    );
  }
  if (name === "settings") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6.5h3m-6.8 3.4 2.1-2.1m8.4 0 2.1 2.1M5.75 12h3m6.5 0h3m-9.45 4.2-2.1-2.1m12.6 0-2.1 2.1M10.5 17.5h3M12 14.25A2.25 2.25 0 1012 9.75a2.25 2.25 0 000 4.5z" />
      </svg>
    );
  }
  if (name === "overview") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12 12 4.5 19.5 12M6.75 10.5v8.25h10.5V10.5" />
      </svg>
    );
  }
  if (name === "terms") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.75h7l3 3v11.5H7V4.75zM13.75 4.75v3.5h3.5M9.5 12h5M9.5 15h5" />
      </svg>
    );
  }
  if (name === "privacy") {
    return (
      <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.25 5.75 6.5v4.75c0 4.25 2.66 6.85 6.25 8.5 3.59-1.65 6.25-4.25 6.25-8.5V6.5L12 4.25z" />
      </svg>
    );
  }
  return (
    <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6.75h14v10.5H5V6.75zM5 7l7 5.5L19 7" />
    </svg>
  );
}

function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-text-primary" title="Ads Control">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Ads Control" className="h-full w-full object-cover" />
    </Link>
  );
}

function MobileBrand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-text-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Ads Control" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block truncate text-[10px] font-black uppercase text-accent">Meta Ads + GPT</span>
        <span className="mt-1 block truncate text-sm font-black text-text-primary">Ads Control</span>
      </span>
    </Link>
  );
}

function UserMenu({
  open,
  setOpen,
  user,
  dropdownRef,
  onLogout,
  placement,
}: {
  open: boolean;
  setOpen: (open: boolean | ((value: boolean) => boolean)) => void;
  user: NonNullable<ReturnType<typeof useAuth>["state"]["user"]>;
  dropdownRef: RefObject<HTMLDivElement>;
  onLogout: () => void;
  placement: "right" | "bottom";
}) {
  const triggerClass =
    placement === "right"
      ? "flex w-full items-center gap-3 rounded-lg border border-border bg-bg-card px-3 py-2 text-left transition hover:bg-bg-secondary"
      : "flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-card text-text-primary transition hover:bg-bg-secondary";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
        title={user.name}
        aria-label="Open user menu"
      >
        <Avatar name={user.name} src={user.picture?.data.url} />
        {placement === "right" && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-text-primary">{user.name}</span>
            <span className="block truncate text-xs text-text-muted">{user.email ?? "Meta user"}</span>
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border bg-bg-card shadow-2xl ${
            placement === "right" ? "left-full bottom-0 ml-3" : "right-0 top-full mt-2"
          }`}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Avatar name={user.name} src={user.picture?.data.url} large />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
              {user.email && <p className="truncate text-xs text-text-muted">{user.email}</p>}
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm text-text-secondary hover:bg-bg-secondary"
          >
            Settings
          </Link>
          <button onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-bg-secondary">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Avatar({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string;
  large?: boolean;
}) {
  const size = large ? "h-10 w-10 rounded-lg" : "h-8 w-8 rounded-lg";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${size} flex-shrink-0 object-cover`} />;
  }
  return (
    <span className={`${size} flex flex-shrink-0 items-center justify-center bg-accent/12 text-xs font-bold text-accent`}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
