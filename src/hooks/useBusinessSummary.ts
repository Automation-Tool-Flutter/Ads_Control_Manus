'use client';

import { useState, useEffect } from 'react';
import { getBusinesses, parseBusinessDetail } from '@/lib/api/businesses';

export interface BusinessSummary {
  adAccounts: number;
  pages: number;
  instagramAccounts: number;
  catalogs: number;
  users: number;
}

export function useBusinessSummary(businessId: string, token: string | null): BusinessSummary | null {
  const [summary, setSummary] = useState<BusinessSummary | null>(null);

  useEffect(() => {
    if (!token) return;
    getBusinesses(token).then(businesses => {
      const biz = businesses.find(b => b.id === businessId);
      if (!biz) return;
      const detail = parseBusinessDetail(biz);
      setSummary({
        adAccounts: detail.adAccounts.length,
        pages: detail.pages.length,
        instagramAccounts: detail.instagramAccounts.length,
        catalogs: detail.catalogs.length,
        users: detail.users.length,
      });
    }).catch(() => {});
  }, [businessId, token]);

  return summary;
}
