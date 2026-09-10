import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export function MobileAIEntry({ chatHref }: { chatHref: string }) {
  const prompts = [
    { label: 'Review spend', question: 'Which campaigns should I review for wasted budget? Explain using the available evidence.' },
    { label: 'Explain changes', question: 'Why did performance change compared with the previous period?' },
  ];

  return (
    <section className="mobile-dashboard-ai" aria-label="Meta AI shortcuts">
      <div className="mobile-dashboard-ai-heading">
        <BrandLogo size={32} decorative />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-text-primary">Meta AI</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Insights for this account</p>
        </div>
        <Link href={chatHref} className="mobile-dashboard-ai-open" aria-label="Open Meta AI chat for this account">
          Open chat <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="mobile-dashboard-ai-prompts">
        {prompts.map(prompt => (
          <Link key={prompt.label} href={`${chatHref}&question=${encodeURIComponent(prompt.question)}`}>
            {prompt.label}<span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
