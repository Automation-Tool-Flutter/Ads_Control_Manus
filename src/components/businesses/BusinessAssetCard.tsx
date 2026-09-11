'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { CopyButton } from '@/components/ui/CopyButton';
import { StatusDot } from '@/components/ui/StatusBadge';
import { parseBusinessDetail } from '@/lib/api/businesses';
import type { Business } from '@/lib/types';

/** A compact portfolio summary. Detailed information lives in the business profile. */
export const BusinessAssetCard = memo(function BusinessAssetCard({ business }: { business: Business }) {
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const detail = parseBusinessDetail(business);
  const status = business.verification_status;
  const label = status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending verification' : status === 'not_verified' ? 'Not verified' : status || 'Verification unknown';
  const color = status === 'verified' ? 'green' : status === 'pending' ? 'yellow' : 'gray';
  const metrics = [
    ['Ad accounts', detail.adAccounts.length], ['Pages', detail.pages.length],
    ['Users', detail.users.length], ['Catalogs', detail.catalogs.length],
  ] as const;

  return <article className="business-asset-card" aria-label={business.name}>
    <div className="business-asset-heading">
      <Link href={`/businesses/${business.id}`} className="business-asset-open" aria-label={`Open assets for ${business.name}`}>
        <span className="business-asset-avatar" aria-hidden="true">
          {business.profile_picture_uri && failedPicture !== business.profile_picture_uri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.profile_picture_uri} alt="" width={36} height={36} loading="lazy" onError={() => setFailedPicture(business.profile_picture_uri ?? null)} />
          ) : (business.name.trim().charAt(0).toUpperCase() || 'B')}
        </span>
        <div className="business-asset-name"><h2>{business.name}</h2><span className="business-asset-status"><StatusDot color={color} />{label}</span></div>
        <span className="business-asset-chevron" aria-hidden="true">›</span>
      </Link>
      <CopyButton value={business.id} />
    </div>
    <p className="business-asset-id"><span>ID</span> <code>{business.id}</code></p>
    <dl className="business-asset-stats">
      {metrics.map(([name, count]) => <div key={name}><dt>{name}</dt><dd>{count.toLocaleString('en-US')}</dd></div>)}
    </dl>
  </article>;
});
