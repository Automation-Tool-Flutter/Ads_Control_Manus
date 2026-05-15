import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="text-accent text-sm hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-text-primary mt-6 mb-2">
        Terms of Use
      </h1>
      {/* <p className="text-text-muted text-sm mb-8">Last updated: 01/01/2025</p> */}

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          1. Acceptance of Terms
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          By accessing and using Ads Manager - AI Support, you agree to be bound
          by these terms. If you do not agree, please do not use the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          2. Service Description
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Ads Manager - AI Support provides a Facebook advertising management
          platform, including: Ad Account, Campaign and Ad Set management,
          Facebook Pages, creating &amp; scheduling posts, viewing Page Insights
          and AI-powered optimization via Gemini.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          3. Eligibility &amp; Acceptable Use
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>You must have a valid Facebook account</li>
          <li>
            You must be authorized to manage the Ad Accounts and Pages you
            connect
          </li>
          <li>
            You may not use the service in violation of Meta/Facebook policies
          </li>
          <li>
            You may not attempt unauthorized access to the system or other
            users&apos; data
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          4. User Rights &amp; Responsibilities
        </h2>
        <ul className="list-disc list-inside text-text-secondary text-sm space-y-1">
          <li>You are responsible for all activity on your account</li>
          <li>You must keep your credentials and access tokens secure</li>
          <li>Report any unauthorized access immediately</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          5. Limitation of Liability
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Ads Manager - AI Support is not liable for: data loss caused by Meta
          API errors, service interruptions beyond our control, or advertising
          decisions made based on AI recommendations.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          6. Intellectual Property
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          All interfaces, source code and designs are the property of Ads
          Optimize Manager. Users may not copy or redistribute them.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          7. Termination
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          We reserve the right to terminate access upon discovery of a terms
          violation, without prior notice.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          8. Changes to Terms
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          We may update these terms at any time. Changes take effect immediately
          upon posting.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          9. Governing Law
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          These terms are governed by the laws of Vietnam.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          10. Contact
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          For any questions, please reach out via email or our official support
          channel.
        </p>
      </section>
    </div>
  );
}
