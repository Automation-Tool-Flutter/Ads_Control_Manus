import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument, type LegalSection } from '@/components/layout/LegalDocument';

export const metadata: Metadata = {
  title: 'Terms of Service | Meta Ads AI',
  description: 'Terms for using Meta Ads AI, connected Facebook assets and AI-assisted advertising tools.',
};

const sections: LegalSection[] = [
  { id: 'agreement', title: 'Using the service', content: <p>These terms govern your use of Meta Ads AI. By using the service, you agree to these terms. If you do not agree, do not use the service. Meta Ads AI is an independent application, not an official product of or an endorsement by Meta Platforms, Inc.</p> },
  { id: 'service', title: 'What the service provides', content: <p>Meta Ads AI provides tools to view advertising insights, manage connected campaigns and Pages, and receive AI-assisted analysis and recommendations. Available functionality depends on Facebook permissions, account eligibility and third-party platform availability.</p> },
  { id: 'access', title: 'Accounts and authorization', content: <ul>
    <li>Connect only accounts, Pages and business assets you are authorized to manage.</li>
    <li>Keep your login credentials secure and notify us if you suspect unauthorized access.</li>
    <li>If acting for a business or another person, you must have authority to act on their behalf.</li>
    <li>You must satisfy the age and eligibility requirements of the platforms you connect.</li>
  </ul> },
  { id: 'responsibilities', title: 'Your responsibilities', content: <><p>You are responsible for the content you submit and the actions you authorize, including campaign changes, publishing and advertising budgets. Review account selections, amounts and settings before confirming an action. Advertising charges are governed by your arrangements with the advertising platform.</p><p>Do not use the application for unlawful activity, unauthorized access, misleading advertising, infringement of others’ rights or interference with the service. Follow the applicable rules of Facebook and any other connected platform.</p></> },
  { id: 'ai', title: 'AI recommendations', content: <p>AI output can be incomplete or inaccurate. It is intended to assist your decisions and does not guarantee campaign approval, business results or financial returns. Check recommendations against your account data and business requirements before acting. You remain responsible for decisions and changes you approve.</p> },
  { id: 'privacy', title: 'Privacy and your content', content: <><p>Our <Link href="/privacy-policy">Privacy Policy</Link> explains how account information, cookies, advertising data and AI requests are processed.</p><p>You retain your rights in the content you submit. You authorize the processing of that content as needed to provide the features you request, including communication with connected platforms and service providers. Submit only information you have the right to use and share.</p></> },
  { id: 'availability', title: 'Availability and third-party services', content: <p>Features may change or become unavailable because of maintenance, platform changes, permission restrictions or service interruptions. We do not guarantee uninterrupted availability or error-free reports. Third-party services operate under their own terms, policies and charges.</p> },
  { id: 'ending', title: 'Ending access', content: <p>You can stop using the application, log out or revoke permissions through Facebook at any time. Access may be restricted to address misuse, security issues or platform requirements. Revoking access does not undo campaigns, published content or other actions previously submitted to Facebook.</p> },
  { id: 'liability', title: 'Limitations and your rights', content: <p>To the extent permitted by applicable law, the service is provided as available without guarantees of particular advertising outcomes. These terms do not exclude liability or consumer rights that cannot lawfully be excluded. You should maintain copies of information important to your business.</p> },
  { id: 'changes', title: 'Changes and contact', content: <p>Updates to these terms will be published here with a revised date. For questions about these terms or the service, contact <a href="mailto:info@newgame.studio">info@newgame.studio</a>.</p> },
];

export default function TermsOfServicePage() {
  return <LegalDocument kind="terms" title="Terms of Service" description="The terms for using your advertising workspace, connected accounts and AI tools." sections={sections} />;
}
