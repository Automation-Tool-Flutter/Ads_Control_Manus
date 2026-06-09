import type { FBUser } from "@/lib/types";
import {
  FB_API_VERSION,
  FB_APP_ID,
  FB_LOGIN_CONFIG_ID,
  FB_PERMISSIONS,
  GRAPH_API_BASE,
} from "@/lib/constants";

interface OAuthUrlParams {
  redirectUri: string;
  state: string;
  rerequest?: boolean;
}

export interface FacebookOAuthCallback {
  accessToken: string;
  expiresIn: number;
  grantedScopes: string[];
  deniedScopes: string[];
  state: string;
}

export interface FacebookOAuthError {
  error: string;
  errorDescription?: string;
  state?: string;
}

interface PermissionItem {
  permission: string;
  status: "granted" | "declined" | "expired";
}

function splitScopes(value: string | null): string[] {
  return value?.split(",").map((scope) => scope.trim()).filter(Boolean) ?? [];
}

function graphUrl(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set("access_token", accessToken);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

export function createFacebookOAuthState() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getFacebookOAuthRedirectUri() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/login`;
}

export function buildFacebookOAuthUrl({ redirectUri, state, rerequest }: OAuthUrlParams) {
  const url = new URL(`https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", FB_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("return_scopes", "true");
  url.searchParams.set("state", state);

  if (FB_LOGIN_CONFIG_ID) {
    url.searchParams.set("config_id", FB_LOGIN_CONFIG_ID);
  } else {
    url.searchParams.set("scope", FB_PERMISSIONS.join(","));
  }

  if (rerequest) {
    url.searchParams.set("auth_type", "rerequest");
  }

  return url.toString();
}

export function parseFacebookOAuthCallback(
  url: Location,
): FacebookOAuthCallback | FacebookOAuthError | null {
  const params = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const queryParams = new URLSearchParams(url.search);

  const error = params.get("error") ?? queryParams.get("error");
  if (error) {
    return {
      error,
      errorDescription:
        params.get("error_description") ?? queryParams.get("error_description") ?? undefined,
      state: params.get("state") ?? queryParams.get("state") ?? undefined,
    };
  }

  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  const expiresIn = Number(params.get("expires_in") ?? "0");

  return {
    accessToken,
    expiresIn: Number.isFinite(expiresIn) ? expiresIn : 0,
    grantedScopes: splitScopes(params.get("granted_scopes")),
    deniedScopes: splitScopes(params.get("denied_scopes")),
    state: params.get("state") ?? "",
  };
}

export function clearFacebookOAuthCallbackUrl() {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, document.title, window.location.pathname);
}

export function getCookieValue(name: string) {
  if (typeof document === "undefined") return null;
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(encodedName));
  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null;
}

export function clearCookieValue(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=/; SameSite=Lax`;
}

export async function fetchFacebookPermissions(accessToken: string) {
  const response = await fetch(graphUrl("/me/permissions", accessToken));
  const payload = await response.json();

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? "Failed to fetch Facebook permissions");
  }

  const items = Array.isArray(payload?.data) ? (payload.data as PermissionItem[]) : [];

  return {
    granted: items
      .filter((item) => item.status === "granted")
      .map((item) => item.permission),
    denied: items
      .filter((item) => item.status !== "granted")
      .map((item) => item.permission),
  };
}

export async function fetchFacebookUser(accessToken: string): Promise<FBUser> {
  const response = await fetch(
    graphUrl("/me", accessToken, { fields: "id,name,email,picture" }),
  );
  const payload = await response.json();

  if (!response.ok || payload?.error || !payload?.id) {
    throw new Error(payload?.error?.message ?? "Failed to fetch user info");
  }

  return payload as FBUser;
}
