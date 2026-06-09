export const GRAPH_API_VERSION = "v25.0";
export const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
export const FB_API_VERSION =
  process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION ||
  process.env.NEXT_PUBLIC_FB_API_VERSION ||
  GRAPH_API_VERSION;
export const FB_APP_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
  process.env.NEXT_PUBLIC_FB_APP_ID ||
  "3052289695158760";
export const FB_LOGIN_CONFIG_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_LOGIN_CONFIG_ID ||
  process.env.NEXT_PUBLIC_FB_LOGIN_CONFIG_ID ||
  "";
export const FB_OAUTH_REDIRECT_URI =
  process.env.NEXT_PUBLIC_FACEBOOK_OAUTH_REDIRECT_URI ||
  process.env.NEXT_PUBLIC_FB_OAUTH_REDIRECT_URI ||
  "";

export const FB_PERMISSIONS = [
  "ads_read",
  "ads_management",
  "business_management",
  "email",
  "pages_show_list",
  "pages_read_user_content",
  "pages_read_engagement",
  "read_insights",
  "pages_manage_posts",
  "pages_manage_engagement",
  "pages_manage_metadata",
  "pages_manage_ads",
  "catalog_management",
];

export const STORAGE_KEYS = {
  TOKEN: "ads_access_token",
  TOKEN_EXPIRY: "ads_token_expiry",
  APP_ID: "ads_app_id",
  USER: "ads_user",
  GRANTED_SCOPES: "ads_granted_scopes",
  DENIED_SCOPES: "ads_denied_scopes",
  OAUTH_STATE: "ads_oauth_state",
  OAUTH_RETURN_TO: "ads_oauth_return_to",
} as const;

// Facebook error codes indicating the token is invalid/expired → auto-logout
export const FB_AUTH_ERROR_CODES = [190, 102, 2500, 463, 467];

// Missing permission → show ReauthError UI
export const FB_PERMISSION_ERROR_CODES = [10, 200, 270];

// Rate limit exceeded → show friendly retry message
export const FB_RATE_LIMIT_CODES = [4, 17, 613];

// Transient server error → show retry message
export const FB_TRANSIENT_ERROR_CODES = [1, 2];

// Custom event name dispatched by graphFetch when auth fails
export const FB_AUTH_ERROR_EVENT = 'fb-auth-error';

// Meta Graph API native date presets — anything not in this list must be converted to time_range
export const META_NATIVE_PRESETS = new Set([
  'today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month', 'maximum',
]);
