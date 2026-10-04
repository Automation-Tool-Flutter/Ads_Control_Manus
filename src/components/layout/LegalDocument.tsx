import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export type LegalSection = { id: string; title: string; content: React.ReactNode };

export function LegalDocument({ title, description, sections, kind }: {
  title: string; description: string; sections: LegalSection[]; kind: 'privacy' | 'terms' | 'deletion';
}) {
  return <div className="legal-page">
    <a className="legal-skip" href="#legal-content">Skip to content</a>
    <header className="legal-header">
      <Link href="/" className="legal-brand"><BrandLogo size={32} decorative /><span>Meta Ads AI</span></Link>
      <Link href="/login" className="legal-login">Open app</Link>
    </header>
    <div className="legal-layout">
      <aside className="legal-sidebar">
        <p className="legal-eyebrow">Policies &amp; information</p>
        <nav aria-label="Legal documents" className="legal-documents">
          <Link href="/privacy-policy" aria-current={kind === 'privacy' ? 'page' : undefined}>Privacy Policy</Link>
          <Link href="/terms-of-service" aria-current={kind === 'terms' ? 'page' : undefined}>Terms of Service</Link>
          <Link href="/data-deletion" aria-current={kind === 'deletion' ? 'page' : undefined}>User Data Deletion</Link>
        </nav>
        <nav aria-label="On this page" className="legal-contents">
          <p>On this page</p>
          {sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        </nav>
      </aside>
      <main id="legal-content" className="legal-article" tabIndex={-1}>
        <div className="legal-intro">
          <p className="legal-eyebrow">Meta Ads AI</p>
          <h1>{title}</h1>
          <p className="legal-description">{description}</p>
          <p className="legal-updated">Last updated: <time dateTime="2026-10-04">October 4, 2026</time></p>
        </div>
        {sections.map((section, index) => <section id={section.id} key={section.id} className="legal-section" aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</h2>
          {section.content}
        </section>)}
        <footer className="legal-footer">
          <p>Questions about these policies? <a href="mailto:info@newgame.studio">Contact us</a>.</p>
          <nav aria-label="Related information"><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms-of-service">Terms of Service</Link><Link href="/data-deletion">Data deletion</Link></nav>
          <small>Meta Ads AI is an independent application and is not an official product of Meta Platforms, Inc.</small>
        </footer>
      </main>
    </div>
  </div>;
}
