import { BrandLogo } from '@/components/ui/BrandLogo';

export function ChatIdentity() {
  return <div className="meta-chat-identity"><span className="meta-chat-avatar"><BrandLogo size={28} decorative /></span><span>Meta AI</span></div>;
}

export function ChatThinking({ message = 'Analyzing your data…' }: { message?: string }) {
  return <div className="meta-chat-thinking" role="status" aria-live="polite" aria-atomic="true">
    <span className="meta-ai-activity-mark" aria-hidden="true"><span><BrandLogo size={40} decorative /></span></span>
    <span className="meta-ai-activity-label">{message}</span>
  </div>;
}
