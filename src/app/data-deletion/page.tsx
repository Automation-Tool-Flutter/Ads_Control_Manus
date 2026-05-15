import Link from "next/link";

export default function DataDeletionPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="text-accent text-sm hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-text-primary mt-6 mb-2">
        Data Deletion Instructions
      </h1>

      <section>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          Ads Manager - AI Support does not store your personal data on our
          servers. Your Facebook access token is stored exclusively in your
          browser&apos;s localStorage and is never transmitted to or retained by
          our systems.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          How to Delete Your Data
        </h2>
        <p className="text-text-secondary text-sm mb-4">
          To remove all access and data associated with Ads Manager - AI
          Support, follow these steps:
        </p>
        <ol className="list-decimal list-inside text-text-secondary text-sm space-y-4">
          <li className="leading-relaxed">
            Go to{" "}
            <strong>
              Facebook Settings → Settings &amp; Privacy → Settings → Security
              and Login → Apps and Websites
            </strong>
          </li>
          <li className="leading-relaxed">
            Find <strong>&quot;Ads Manager - AI Support&quot;</strong> in the
            list and click <strong>Remove</strong>
          </li>
          <li className="leading-relaxed">
            Once removed, all permissions granted to the app are immediately
            revoked. Any access token stored in your browser is automatically
            invalidated and no longer functions.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          Note
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Since we store no personal data on our servers, there is nothing
          additional to request deletion of on our end. Revoking app access via
          Facebook Settings is the complete data deletion process.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-text-primary mt-8 mb-3">
          Contact
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          If you have any questions about data deletion, please contact us at{" "}
          <a
            href="mailto:info@newgame.studio"
            className="text-accent hover:underline"
          >
            info@newgame.studio
          </a>
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-border">
        <Link href="/privacy" className="text-accent text-sm hover:underline">
          ← View Privacy Policy
        </Link>
      </div>
    </div>
  );
}
