import type { Metadata } from 'next';
import { LegalDocument, type LegalSection } from '@/components/layout/LegalDocument';

export const metadata: Metadata = {
  title: 'Privacy Policy | Meta Ads AI',
  description: 'How Meta Ads AI handles account information, advertising data, cookies and your privacy choices.',
};

const sections: LegalSection[] = [
  { id: 'about', title: 'About this policy', content: <p>This policy explains how Meta Ads AI processes information when you connect Facebook accounts, manage advertising and Pages, or use our AI tools. It covers this application; Facebook and other third-party services have their own privacy policies.</p> },
  { id: 'information', title: 'Information we process', content: <ul>
    <li><strong>Account information:</strong> your Facebook identifier, name, profile picture and email where provided and authorized.</li>
    <li><strong>Connected assets:</strong> the ad accounts, campaigns, ad sets, ads, Pages, posts and performance insights available under the permissions you grant.</li>
    <li><strong>Your input:</strong> questions, campaign briefs, content and other information you submit to application features.</li>
    <li><strong>Session information:</strong> access credentials, granted permissions and expiry information needed to maintain your connection.</li>
  </ul> },
  { id: 'use', title: 'How information is used', content: <p>We use this information to sign you in, display connected assets and performance reports, carry out management actions you request, and generate AI analysis and recommendations. The permissions you grant determine which Facebook information and actions are available.</p> },
  { id: 'cookies', title: 'Cookies and local storage', content: <><p>Authentication is stored in HTTP-only session cookies that browser JavaScript cannot read. Our server reads these cookies to authenticate requests and communicate with Facebook on your behalf. Session cookies expire with the session and are cleared by the application logout process.</p><p>Some preferences and feature history, such as theme settings, saved recommendations and chat-related state, may remain in browser storage. Logging out is not the same as deleting all site data. You can remove cookies and local storage through your browser or the host application’s site-data controls.</p></> },
  { id: 'sharing', title: 'Service providers and AI processing', content: <><p>Requests pass through our application server. Facebook receives API requests for the connected assets you access or manage. Relevant prompts and account or campaign context are sent to an external AI service to provide the analysis you request.</p><p>Hosting and AI providers may process information on infrastructure outside your country. Their applicable terms and retention practices also apply to that processing. Avoid submitting passwords, payment card details or personal information that is unnecessary for your request.</p></> },
  { id: 'retention', title: 'Retention and security', content: <><p>Session credentials are retained in cookies until expiry or logout. Locally saved preferences and feature history can remain until cleared. Data held by Facebook or other service providers follows their respective retention rules; clearing this application’s browser storage does not delete those records.</p><p>The application restricts access to authenticated requests and keeps session cookies inaccessible to client-side scripts. No storage or transmission method can guarantee absolute security.</p></> },
  { id: 'choices', title: 'Your choices and deletion requests', content: <ul>
    <li>Log out to end this application’s current session.</li>
    <li>Remove the application in Facebook’s settings to revoke its access to connected assets.</li>
    <li>Clear this site’s cookies and local storage to remove information saved on your device.</li>
    <li>Contact <a href="mailto:info@newgame.studio">info@newgame.studio</a> to request access, correction or deletion of information associated with the service. Describe the account and request without sending passwords or access tokens. We may need to verify your identity.</li>
  </ul> },
  { id: 'updates', title: 'Policy updates', content: <p>We may update this policy as the service changes. The date above identifies the latest revision. Changes will be published on this publicly accessible page.</p> },
  { id: 'contact', title: 'Contact', content: <p>For privacy questions or requests, email <a href="mailto:info@newgame.studio">info@newgame.studio</a>.</p> },
];

export default function PrivacyPolicyPage() {
  return <LegalDocument kind="privacy" title="Privacy Policy" description="Understand what information is used, how it is handled, and the choices available to you." sections={sections} />;
}
