"use client";

import { FB_API_VERSION } from "@/lib/constants";

declare global {
  interface Window {
    FB?: FB;
    fbAsyncInit?: () => void;
  }
}

interface FB {
  init(params: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }): void;
  AppEvents?: {
    logPageView(): void;
  };
  login(
    callback: (response: FBLoginResponse) => void,
    options?: FBLoginOptions,
  ): void;
  logout(callback: () => void): void;
  getLoginStatus(callback: (response: FBLoginResponse) => void): void;
  api(
    path: string,
    params: Record<string, string>,
    callback: (response: unknown) => void,
  ): void;
}

interface FBLoginResponse {
  status: "connected" | "not_authorized" | "unknown";
  authResponse: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
    grantedScopes?: string;
    deniedScopes?: string;
  } | null;
}

interface FBLoginOptions {
  scope?: string;
  return_scopes?: boolean;
  auth_type?: "rerequest" | "reauthorize";
  config_id?: string;
}

let sdkPromise: Promise<FB> | null = null;

function initFacebookSDK(FB: FB, appId: string, version: string) {
  FB.init({
    appId,
    cookie: true,
    xfbml: true,
    version,
  });
  FB.AppEvents?.logPageView();
}

export function loadFacebookSDK(
  appId: string,
  version = FB_API_VERSION,
): Promise<FB> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Not in browser environment"));
  }

  if (!appId) {
    return Promise.reject(new Error("Missing Facebook App ID"));
  }

  // If already loaded with same appId, reinit and reuse
  if (window.FB) {
    initFacebookSDK(window.FB, appId, version);
    return Promise.resolve(window.FB);
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error("Facebook SDK did not initialize"));
        return;
      }
      initFacebookSDK(window.FB, appId, version);
      resolve(window.FB);
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Failed to load Facebook SDK"));
    };

    document.body.appendChild(script);
  });

  return sdkPromise;
}

export type { FB, FBLoginResponse };
