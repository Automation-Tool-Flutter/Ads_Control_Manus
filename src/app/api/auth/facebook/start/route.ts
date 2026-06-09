import { NextRequest, NextResponse } from "next/server";
import { STORAGE_KEYS } from "@/lib/constants";
import {
  buildFacebookOAuthUrl,
  createFacebookOAuthState,
  getFacebookOAuthRedirectUri,
} from "@/lib/facebook-oauth";

export const dynamic = "force-dynamic";

function isSafeReturnTo(value: string | null) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && value !== "/login");
}

function getRequestOrigin(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ?? requestUrl.protocol.replace(":", "");
  const normalizedHost = host.replace(/^0\.0\.0\.0(?::|$)/, (match) =>
    match.endsWith(":") ? "localhost:" : "localhost",
  );

  return `${protocol}://${normalizedHost}`;
}

export function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = getRequestOrigin(request);
  const state = createFacebookOAuthState();
  const redirectUri = getFacebookOAuthRedirectUri(origin);
  const returnTo = requestUrl.searchParams.get("returnTo");
  const oauthUrl = buildFacebookOAuthUrl({
    redirectUri,
    state,
    rerequest: requestUrl.searchParams.get("rerequest") === "1",
  });

  const response = NextResponse.redirect(oauthUrl);
  const secure = new URL(origin).protocol === "https:";

  response.cookies.set(STORAGE_KEYS.OAUTH_STATE, state, {
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 10 * 60,
  });

  if (isSafeReturnTo(returnTo)) {
    response.cookies.set(STORAGE_KEYS.OAUTH_RETURN_TO, returnTo!, {
      path: "/",
      sameSite: "lax",
      secure,
      maxAge: 10 * 60,
    });
  } else {
    response.cookies.delete(STORAGE_KEYS.OAUTH_RETURN_TO);
  }

  return response;
}
