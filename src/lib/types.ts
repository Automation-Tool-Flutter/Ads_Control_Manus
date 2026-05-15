// ─── Facebook Auth ───────────────────────────────────────────────────────────

export interface FBAuthResponse {
  accessToken: string;
  expiresIn: number;
  signedRequest: string;
  userID: string;
}

export interface FBLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse: FBAuthResponse | null;
}

export interface FBUser {
  id: string;
  name: string;
  email?: string;
  picture?: { data: { url: string } };
}

// ─── Ad Account ──────────────────────────────────────────────────────────────

export interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  amount_spent: string;
  balance?: string;
  spend_cap?: string;
  timezone_name?: string;
  business?: { id: string; name: string };
  disable_reason?: number;
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  start_time?: string;
}

export interface CampaignInsight {
  campaign_id: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
}

export interface AdSetInsight {
  adset_id: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
}

// ─── Ad Set ──────────────────────────────────────────────────────────────────

export interface AdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  optimization_goal?: string;
  billing_event?: string;
  start_time?: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface GraphApiError {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

export interface GraphApiResponse<T> {
  data?: T;
  error?: GraphApiError;
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  data: T[];
  nextCursor?: string;
}

// ─── Async State ─────────────────────────────────────────────────────────────

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string; errorCode?: number };

// ─── Auth Context ─────────────────────────────────────────────────────────────

export interface AuthState {
  token: string | null;
  user: FBUser | null;
  isLoading: boolean;
}

// ─── Insights ────────────────────────────────────────────────────────────────

export type DatePreset = 'today' | 'yesterday' | 'last_3d' | 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month' | 'maximum';
export type DateRange = { since: string; until: string };
export type InsightsLevel = 'account' | 'campaign' | 'adset' | 'ad';

export interface InsightsData {
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  date_start?: string;
  date_stop?: string;
}

// ─── Account Detail ──────────────────────────────────────────────────────────

export interface AccountDetail {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  amount_spent: string;
  balance: string;
  spend_cap?: string;
  timezone_name: string;
  business?: { id: string; name: string };
}

// ─── Campaign Detail ──────────────────────────────────────────────────────────

export interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  budget_remaining?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
}

// ─── AdSet Detail ────────────────────────────────────────────────────────────

export interface Targeting {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    cities?: { name: string }[];
    regions?: { name: string }[];
  };
}

export interface AdSetDetail {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal?: string;
  billing_event?: string;
  start_time?: string;
  end_time?: string;
  bid_strategy?: string;
  targeting?: Targeting;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  name: string;
  access_token?: string; // Page Access Token — required for page-specific API calls
  category?: string;
  fan_count?: number;
  followers_count?: number;
  picture?: { data: { url: string } };
  verification_status?: string;
  business?: { id: string; name: string };
}

export interface PagePost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  likes?: { summary: { total_count: number } };
  comments?: { summary: { total_count: number } };
  shares?: { count: number };
  reactions?: { summary: { total_count: number } };
  /** added_video, added_photos, mobile_status_update, shared_story, etc. */
  status_type?: string;
  /** Unix timestamp — only present for scheduled (unpublished) posts */
  scheduled_publish_time?: number;
}

/** Post types Facebook does NOT allow deleting via DELETE /{post_id} */
export const NON_DELETABLE_STATUS_TYPES = new Set([
  'added_video',
  'shared_story',
]);

export interface PageComment {
  id: string;
  message: string;
  from?: { id: string; name: string };
  created_time: string;
  like_count?: number;
  can_hide?: boolean;
  can_remove?: boolean;
  is_hidden?: boolean;
  user_likes?: boolean;
  comments?: { data: PageComment[] };
}

export interface PageInsightDataPoint {
  value: number;
  end_time: string;
}

export interface PageInsightMetric {
  id: string;
  name: string;
  period: string;
  values: PageInsightDataPoint[];
  title: string;
  description: string;
}

export interface PageInsightData {
  data: PageInsightMetric[];
}

export interface PageInfo {
  id: string;
  name: string;
  about?: string;
  description?: string;
  website?: string;
  phone?: string;
  emails?: string[];
  category?: string;
  picture?: { data: { url: string } };
  cover?: { source: string };
  fan_count?: number;
  followers_count?: number;
  verification_status?: string;
}

// ─── Business ────────────────────────────────────────────────────────────────

/** Raw ad account as returned inside nested FB connection */
export interface RawAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  insights?: { data: Array<{ spend: string }> };
}

export interface Business {
  id: string;
  name: string;
  verification_status?: string;
  profile_picture_uri?: string;
  timezone_id?: number;
  created_time?: string;
  primary_page?: { id: string; name: string; category?: string };
  // Nested connections — populated when fetched with full fields
  owned_ad_accounts?: { data: RawAdAccount[]; paging?: { cursors?: { after: string }; next?: string } };
  client_ad_accounts?: { data: RawAdAccount[]; paging?: { cursors?: { after: string }; next?: string } };
  business_users?: { data: BusinessUser[]; paging?: { cursors?: { after: string }; next?: string } };
  owned_pages?: { data: Array<{ id: string; name: string; category?: string; tasks?: string[] }>; paging?: { cursors?: { after: string }; next?: string } };
  client_pages?: { data: Array<{ id: string; name: string; category?: string; tasks?: string[] }>; paging?: { cursors?: { after: string }; next?: string } };
  owned_instagram_accounts?: { data: BusinessInstagramAccount[]; paging?: { cursors?: { after: string }; next?: string } };
  owned_product_catalogs?: { data: Catalog[]; paging?: { cursors?: { after: string }; next?: string } };
}

export interface BusinessAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  ownership: 'owned' | 'client';
  spend?: string;
}

export interface BusinessPage {
  id: string;
  name: string;
  category?: string;
  tasks?: string[];
  ownership?: 'owned' | 'client';
}

export interface BusinessInstagramAccount {
  id: string;
  name?: string;
  username?: string;
  profile_pic?: string;
  profile_picture_url?: string;
}

export interface BusinessUser {
  id: string;
  name: string;
  email?: string;
  /** ADMIN, EMPLOYEE, FINANCE_ANALYST, FINANCE_EDITOR, ADVERTISER, ANALYST, etc. */
  role?: string;
  title?: string;
  created_time?: string;
}

export interface BusinessDetailData {
  detail: Business;
  adAccounts: BusinessAdAccount[];
  pages: BusinessPage[];
  instagramAccounts: BusinessInstagramAccount[];
  catalogs: Catalog[];
  users: BusinessUser[];
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface Catalog {
  id: string;
  name: string;
  product_count?: number;
  vertical?: string;
  feed_count?: number;
  business?: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  price?: string;
  availability?: string;
  image_url?: string;
  url?: string;
  description?: string;
}

// ─── Ad ──────────────────────────────────────────────────────────────────────

export interface Ad {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  creative?: {
    id?: string;
    name?: string;
    title?: string;
    body?: string;
    thumbnail_url?: string;
    image_url?: string;
    call_to_action_type?: string;
  };
  preview_shareable_link?: string;
}
