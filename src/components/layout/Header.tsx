"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toaster";

const APP_NAV = [
  { href: "/businesses", label: "Assets", key: "A" },
  { href: "/accounts", label: "Accounts", key: "$" },
  { href: "/pages", label: "Content", key: "P" },
  { href: "/settings", label: "Settings", key: "S" },
] as const;

const PUBLIC_NAV = [
  { href: "/", label: "Overview", key: "O" },
  { href: "/terms", label: "Terms", key: "T" },
  { href: "/privacy", label: "Privacy", key: "P" },
  { href: "/contact", label: "Contact", key: "C" },
] as const;

export function Header() {
  const { state, logout } = useAuth();
  const { user } = state;
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navItems = user ? APP_NAV : PUBLIC_NAV;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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

  return (
    <>
      <aside className="hidden sm:flex fixed inset-y-4 left-4 z-50 w-[92px] flex-col items-center rounded-[2.25rem] border border-border bg-white/86 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
        <Brand href={user ? "/businesses" : "/"} />

        <nav className="mt-7 flex flex-1 flex-col items-center gap-2">
          {navItems.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className={`group flex h-[58px] w-[58px] flex-col items-center justify-center rounded-2xl text-xs font-black transition-all ${
                  active
                    ? "bg-text-primary text-white shadow-xl shadow-slate-900/20"
                    : "bg-bg-secondary/70 text-text-secondary hover:bg-white hover:text-text-primary hover:shadow-lg"
                }`}
              >
                <span className="text-base leading-none">{item.key}</span>
                <span className={`mt-1 h-1 w-5 rounded-full ${active ? "bg-accent" : "bg-transparent group-hover:bg-border"}`} />
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-status-green shadow-[0_0_0_6px_rgba(21,172,107,0.12)]" />
          {!user && pathname !== "/login" ? (
            <Link
              href="/login"
              className="flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-accent text-xs font-black text-white shadow-xl shadow-accent/20"
              title="Sign in"
            >
              In
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

      <header className="sm:hidden sticky top-0 z-50 px-3 py-2">
        <div className="flex h-14 items-center justify-between gap-3 rounded-[1.75rem] border border-white/80 bg-[linear-gradient(135deg,#f8fafc_0%,#eef7ff_100%)] px-3 shadow-[0_16px_44px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
          <MobileBrand href={user ? "/businesses" : "/"} />

          {!user && pathname !== "/login" && (
            <Link
              href="/login"
              className="mobile-action inline-flex items-center px-4 text-sm font-bold bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent/90"
            >
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

function Brand({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-2xl bg-text-primary shadow-xl shadow-slate-900/20"
      title="Ads Control"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Ads Control" className="h-full w-full object-cover" />
    </Link>
  );
}

function MobileBrand({ href }: { href: string }) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2.5">
      <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-text-primary shadow-[0_10px_28px_rgba(15,23,42,0.2)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Ads Control" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0 leading-none">
        <span className="block truncate text-[11px] font-black uppercase tracking-wide text-accent">
          Ads Control
        </span>
        <span className="mt-1 block truncate text-sm font-black text-text-primary">
          Command Hub
        </span>
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
      ? "flex h-[58px] w-[58px] items-center justify-center rounded-2xl bg-bg-secondary/80 text-text-primary shadow-lg transition hover:bg-white"
      : "flex h-11 items-center gap-2 rounded-full border border-border bg-white px-2 pr-3 text-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition hover:bg-bg-secondary";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className={triggerClass}
        title={user.name}
      >
        <Avatar name={user.name} src={user.picture?.data.url} />
        {placement === "bottom" && (
          <span className="text-xs font-black text-text-secondary">Menu</span>
        )}
      </button>

      {open && (
        <div
          className={`absolute w-[min(18rem,calc(100vw-1.5rem))] surface-raised rounded-2xl overflow-hidden z-50 ${
            placement === "right" ? "left-full bottom-0 ml-3" : "right-0 top-full mt-2"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Avatar name={user.name} src={user.picture?.data.url} large />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">
                {user.name}
              </p>
              {user.email && (
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              )}
            </div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-bg-secondary border-b border-border"
          >
            Settings
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-bg-secondary"
          >
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
  const size = large ? "h-10 w-10 rounded-2xl" : "h-8 w-8 rounded-xl";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={`${size} object-cover flex-shrink-0`} />;
  }
  return (
    <span
      className={`${size} flex flex-shrink-0 items-center justify-center bg-accent/15 text-xs font-bold text-accent`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
