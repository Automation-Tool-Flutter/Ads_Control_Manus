import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument, type LegalSection } from '@/components/layout/LegalDocument';

export const metadata: Metadata = {
  title: 'User Data Deletion | Meta AI Ads',
  description: 'How to remove your Meta AI Ads session, clear saved data and request deletion of information associated with your account.',
};

const sections: LegalSection[] = [
  {
    id: 'overview', title: 'Your data and your choices',
    content: <p>You can stop using Meta AI Ads, remove its access to your Facebook assets and request deletion of information associated with the service. These instructions are available without signing in.</p>,
  },
  {
    id: 'session', title: 'End your session',
    content: <><p>If you are signed in, choose Logout in the application to clear the current authentication session. Authentication uses HTTP-only cookies.</p><p>Logging out does not remove all preferences or feature history stored on your device. Follow the next steps to remove that information too.</p></>,
  },
  {
    id: 'device', title: 'Remove data saved on your device',
    content: <><ul>
      <li>In your browser settings, find the site-data controls for this application’s domain and remove its cookies and local storage.</li>
      <li>If you use the application inside a mobile WebView, use the host application’s available controls to clear its web data. Contact support if those controls are not available.</li>
      <li>Repeat this on other browsers or devices where you used the application. Clearing one device does not clear another.</li>
    </ul><p>This removes locally saved preferences and feature history, including saved recommendations or chat-related state. Files you exported, such as CSV reports, must be deleted separately from your device.</p></>,
  },
  {
    id: 'disconnect', title: 'Revoke Facebook access',
    content: <p>In your Facebook settings, find the connected application under Apps and Websites or Business Integrations, then remove its access. Select the entry you authorized when connecting Meta AI Ads. This step is separate from logging out or clearing browser data.</p>,
  },
  {
    id: 'request', title: 'Request deletion of your information',
    content: <><p>Email <a href="mailto:info@newgame.studio?subject=Meta%20AI%20Ads%20-%20Data%20deletion%20request">info@newgame.studio</a> with the subject “Meta AI Ads — Data deletion request”.</p><ul>
      <li>Include the name or account identifier used with the application and a contact email for the reply.</li>
      <li>Describe the information you want deleted so we can identify your request.</li>
      <li>Do not send passwords, access tokens or payment card details.</li>
    </ul><p>We may need to verify your identity before processing the request. You can use the same email thread to ask about its status or any information that cannot be deleted and the reason.</p></>,
  },
  {
    id: 'scope', title: 'What these steps do not delete',
    content: <><p>Removing this application’s access or local data does not delete your Facebook account, Pages, campaigns, published posts or advertising records. Manage those directly through Facebook’s controls.</p><p>Information retained by third-party service providers is subject to their own policies and retention requirements. For more information about how this application processes data, read our <Link href="/privacy-policy">Privacy Policy</Link>.</p></>,
  },
];

export default function DataDeletionPage() {
  return <LegalDocument kind="deletion" title="User Data Deletion" description="Remove saved information, disconnect your account and contact us about a deletion request." sections={sections} />;
}
