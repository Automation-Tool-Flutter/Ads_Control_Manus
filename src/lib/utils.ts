import type { DatePreset, DateRange } from './types';

// ─── Date Presets ─────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export function presetToRange(preset: DatePreset): DateRange {
  const today = new Date();
  const until = toISODate(today);
  const daysAgo = (n: number) =>
    toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));

  switch (preset) {
    case 'today':       return { since: until, until };
    case 'yesterday':   return { since: daysAgo(1), until: daysAgo(1) };
    case 'last_3d':     return { since: daysAgo(3), until };
    case 'last_7d':     return { since: daysAgo(7), until };
    case 'last_14d':    return { since: daysAgo(14), until };
    case 'last_30d':    return { since: daysAgo(30), until };
    case 'this_month': {
      const since = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
      return { since, until };
    }
    case 'last_month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last  = new Date(today.getFullYear(), today.getMonth(), 0);
      return { since: toISODate(first), until: toISODate(last) };
    }
    case 'maximum': return { since: '2015-01-01', until };
  }
}

export function dateFilterKey(filter: DatePreset | DateRange): string {
  if (typeof filter === 'string') return filter;
  return `${filter.since}_${filter.until}`;
}

export function dateFilterLabel(filter: DatePreset | DateRange): string {
  if (typeof filter === 'string') {
    if (filter === 'maximum') return 'Lifetime';
    const range = presetToRange(filter);
    return `${range.since} to ${range.until}`;
  }
  return `${filter.since} to ${filter.until}`;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amountCents: string | number, currency = 'USD'): string {
  const amount = typeof amountCents === 'string' ? parseFloat(amountCents) : amountCents;
  if (isNaN(amount)) return '—';
  const value = amount / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '—';
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoString));
}

export function truncateId(id: string, length = 12): string {
  return id.length > length ? `...${id.slice(-length)}` : id;
}

// ─── Account Status ──────────────────────────────────────────────────────────

export interface StatusInfo {
  label: string;
  color: 'green' | 'red' | 'yellow' | 'gray';
}

const ACCOUNT_STATUS_MAP: Record<number, StatusInfo> = {
  1:   { label: 'Active',       color: 'green' },
  2:   { label: 'Disabled',     color: 'red' },
  3:   { label: 'Unconfirmed',  color: 'yellow' },
  7:   { label: 'Deactivated',  color: 'red' },
  8:   { label: 'Normal',       color: 'green' },
  9:   { label: 'Closed',       color: 'red' },
  100: { label: 'In Review',    color: 'yellow' },
  101: { label: 'Flagged',      color: 'yellow' },
};

export function getAccountStatus(status: number): StatusInfo {
  return ACCOUNT_STATUS_MAP[status] ?? { label: `Status ${status}`, color: 'gray' };
}

const CAMPAIGN_STATUS_MAP: Record<string, StatusInfo> = {
  ACTIVE:   { label: 'Active',   color: 'green' },
  PAUSED:   { label: 'Paused',   color: 'yellow' },
  DELETED:  { label: 'Deleted',  color: 'red' },
  ARCHIVED: { label: 'Archived', color: 'gray' },
};

export function getCampaignStatus(status: string): StatusInfo {
  return CAMPAIGN_STATUS_MAP[status] ?? { label: status, color: 'gray' };
}

// Same mapping for ad sets
export const getAdSetStatus = getCampaignStatus;

// ─── Objective Labels ─────────────────────────────────────────────────────────

const OBJECTIVE_MAP: Record<string, string> = {
  APP_INSTALLS:         'App Installs',
  BRAND_AWARENESS:      'Brand Awareness',
  CONVERSIONS:          'Conversions',
  EVENT_RESPONSES:      'Event Responses',
  LEAD_GENERATION:      'Lead Generation',
  LINK_CLICKS:          'Link Clicks',
  LOCAL_AWARENESS:      'Local Awareness',
  MESSAGES:             'Messages',
  OFFER_CLAIMS:         'Offer Claims',
  OUTCOME_APP_PROMOTION:'App Promotion',
  OUTCOME_AWARENESS:    'Awareness',
  OUTCOME_ENGAGEMENT:   'Engagement',
  OUTCOME_LEADS:        'Leads',
  OUTCOME_SALES:        'Sales',
  OUTCOME_TRAFFIC:      'Traffic',
  PAGE_LIKES:           'Page Likes',
  POST_ENGAGEMENT:      'Post Engagement',
  REACH:                'Reach',
  STORE_VISITS:         'Store Visits',
  VIDEO_VIEWS:          'Video Views',
};

export function getObjectiveLabel(objective: string): string {
  return OBJECTIVE_MAP[objective] ?? objective;
}

const OPT_GOAL_MAP: Record<string, string> = {
  NONE:                 'None',
  APP_INSTALLS:         'App Installs',
  CLICKS:               'Clicks',
  ENGAGED_USERS:        'Engaged Users',
  IMPRESSIONS:          'Impressions',
  LINK_CLICKS:          'Link Clicks',
  OFFSITE_CONVERSIONS:  'Offsite Conversions',
  PAGE_LIKES:           'Page Likes',
  POST_ENGAGEMENT:      'Post Engagement',
  REACH:                'Reach',
  REPLIES:              'Replies',
  THRUPLAY:             'ThruPlay',
  LANDING_PAGE_VIEWS:   'Landing Page Views',
  LEAD_GENERATION:      'Lead Generation',
  QUALITY_LEAD:         'Quality Leads',
  CONVERSATIONS:        'Conversations',
  VALUE:                'Value',
  MESSAGING_PURCHASE_CONVERSION: 'Messaging Purchase Conversion',
  MESSAGING_APPOINTMENT_CONVERSION: 'Messaging Appointment Conversion',
  VISIT_INSTAGRAM_PROFILE: 'Visit Instagram Profile',
  VIDEO_VIEWS:          'Video Views',
  SOCIAL_IMPRESSIONS:   'Social Impressions',
  DERIVED_EVENTS:       'Derived Events',
  SUBSCRIBERS:          'Subscribers',
  IN_APP_VALUE:         'In-App Value',
  REMINDERS:            'Reminders',
  AD_RECALL_LIFT:       'Ad Recall Lift',
  VISIT_INSTAGRAM_PROFILE_REACH: 'Visit Instagram Profile Reach',
};

export function getOptGoalLabel(goal: string): string {
  return OPT_GOAL_MAP[goal] ?? goal;
}

const BILLING_EVENT_MAP: Record<string, string> = {
  APP_INSTALLS:    'App Installs',
  CLICKS:          'Clicks',
  IMPRESSIONS:     'Impressions',
  LINK_CLICKS:     'Link Clicks',
  NONE:            'None',
  OFFER_CLAIMS:    'Offer Claims',
  PAGE_LIKES:      'Page Likes',
  POST_ENGAGEMENT: 'Post Engagement',
  THRUPLAY:        'ThruPlay',
  VIDEO_VIEWS:     'Video Views',
};

export function getBillingEventLabel(event: string): string {
  return BILLING_EVENT_MAP[event] ?? event;
}

// ─── Number Formatting ────────────────────────────────────────────────────────

/** Format insights spend (already in currency units, NOT cents) */
export function formatSpend(n: string | number | undefined, currency = 'USD'): string {
  if (n === undefined || n === null || n === '') return '—';
  const amount = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact number: 45200 → "45.2K", 1200000 → "1.2M" */
export function formatCompact(n: string | number | undefined): string {
  if (n === undefined || n === null || n === '') return '—';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.round(num));
}

export function formatNumber(n: string | number): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(n: string | number): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100);
}

// ─── Ad Status ───────────────────────────────────────────────────────────────

export const getAdStatus = getCampaignStatus;

const EFFECTIVE_AD_STATUS_MAP: Record<string, StatusInfo> = {
  ACTIVE:               { label: 'Active',               color: 'green' },
  PAUSED:               { label: 'Paused',               color: 'yellow' },
  DELETED:              { label: 'Deleted',              color: 'red' },
  ARCHIVED:             { label: 'Archived',             color: 'gray' },
  DISAPPROVED:          { label: 'Disapproved',          color: 'red' },
  PENDING_REVIEW:       { label: 'In Review',            color: 'yellow' },
  PENDING_BILLING_INFO: { label: 'Pending Billing Info', color: 'yellow' },
  CAMPAIGN_PAUSED:      { label: 'Campaign Paused',      color: 'yellow' },
  ADSET_PAUSED:         { label: 'Ad Set Paused',        color: 'yellow' },
};

export function getEffectiveAdStatus(status: string): StatusInfo {
  return EFFECTIVE_AD_STATUS_MAP[status] ?? { label: status, color: 'gray' };
}

// ─── Bid Strategy ────────────────────────────────────────────────────────────

const BID_STRATEGY_MAP: Record<string, string> = {
  LOWEST_COST_WITHOUT_CAP:  'Lowest Cost',
  LOWEST_COST_WITH_BID_CAP: 'Bid Cap',
  COST_CAP:                 'Cost Cap',
  MINIMUM_ROAS:             'Minimum ROAS',
};

export function getBidStrategyLabel(strategy: string): string {
  return BID_STRATEGY_MAP[strategy] ?? strategy;
}

const CTA_LABEL_MAP: Record<string, string> = {
  LEARN_MORE:         'Learn More',
  SHOP_NOW:           'Shop Now',
  SIGN_UP:            'Sign Up',
  CONTACT_US:         'Contact Us',
  BOOK_NOW:           'Book Now',
  DOWNLOAD:           'Download',
  GET_OFFER:          'Get Offer',
  SUBSCRIBE:          'Subscribe',
  SEND_MESSAGE:       'Send Message',
  WATCH_MORE:         'Watch More',
  APPLY_NOW:          'Apply Now',
  GET_DIRECTIONS:     'Get Directions',
  ORDER_NOW:          'Order Now',
  CALL_NOW:           'Call Now',
  INSTALL_MOBILE_APP: 'Install App',
  USE_MOBILE_APP:     'Use App',
  PLAY_GAME:          'Play Game',
  NO_BUTTON:          '',
};

export function getCtaLabel(cta: string): string {
  return CTA_LABEL_MAP[cta] ?? cta;
}
