import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="text-accent text-sm hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-text-primary mt-6 mb-2">
        Privacy Policy
      </h1>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          1. Information We Collect
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>
            Personal information: name, email, profile picture (from your
            Facebook account)
          </li>
          <li>Ad account information: Ad Account ID, campaign data, spend</li>
          <li>Page information: Page ID, name, follower count, post content</li>
          <li>Usage data: features used, access timestamps</li>
          <li>
            We do <strong>not</strong> collect: health data, personal financial
            data, biometrics or bank card details
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          2. How We Use Your Information
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>Provide and operate the ad management service</li>
          <li>Display campaign data and insights at your request</li>
          <li>Improve the user experience</li>
          <li>AI analysis via Gemini (data is anonymized where possible)</li>
          <li>Communicate important service updates</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          3. Information Sharing
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>We never sell personal data to third parties</li>
          <li>
            Data is only shared with: technical service providers (hosting, AI)
            and legal authorities when legally required
          </li>
          <li>
            Campaign data is sent to the Google Gemini API for analysis (subject
            to Google&apos;s privacy policy)
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          4. Data Security
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>
            Facebook tokens are stored locally in localStorage and are never
            sent to our servers
          </li>
          <li>All communication uses HTTPS</li>
          <li>Sensitive data is not cached server-side</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          5. Facebook &amp; Instagram Platforms
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Ads Manager - AI Support uses the Meta Graph API to access your
          Facebook and Instagram data under your authorization. Data collected
          includes: account information, ad data, page data and insights. You
          can revoke access at any time at{" "}
          <strong>facebook.com/settings → Apps and Websites</strong>. We comply
          with the{" "}
          <a
            href="https://developers.facebook.com/policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Meta Platform Terms
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          6. International Data Transfers
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Data may be processed on servers outside Vietnam (US, Singapore). We
          ensure appropriate safeguards in line with international standards.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          7. Your Data Rights
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-2">
          <em>Your rights:</em> Access, correct or delete your personal data;
          withdraw consent at any time; lodge a complaint with a data protection
          authority.
        </p>
        <p className="text-text-secondary text-sm leading-relaxed">
          <em>Our rights:</em> Retain data necessary to operate the service and
          comply with legal obligations.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          8. Cookies &amp; Tracking Technologies
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>We use localStorage to store tokens and theme settings</li>
          <li>We do not use third-party advertising tracking cookies</li>
          <li>
            The Facebook Login SDK may set Meta cookies per their own policy
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          9. Links to Third-Party Sites
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          The service may contain links to Meta and Google. We are not
          responsible for the privacy practices of external websites.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          10. Children&apos;s Privacy
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          This service is not intended for users under 18. We do not knowingly
          collect information from minors.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          11. Policy Updates
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          This policy may be updated. Significant changes will be communicated
          via email or in-app notification.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          12. Data Deletion
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          You can request deletion of your data at any time. Since we store no
          personal data on our servers, revoking app access via Facebook
          Settings is the complete process. See our{" "}
          <Link href="/data-deletion" className="text-accent hover:underline">
            Data Deletion Instructions
          </Link>{" "}
          for step-by-step guidance.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          13. Contact Us
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          For any privacy-related questions, please contact us through our
          official support channel at{" "}
          <a
            href="mailto:info@newgame.studio"
            className="text-accent hover:underline"
          >
            info@newgame.studio
          </a>
        </p>
      </section>
    </div>
  );
}
