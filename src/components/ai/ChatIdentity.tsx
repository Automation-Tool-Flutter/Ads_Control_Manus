import { BrandLogo } from '@/components/ui/BrandLogo';

export function ChatIdentity() {
  return <div className="meta-chat-identity"><span className="meta-chat-avatar"><BrandLogo size={28} decorative /></span><span>Meta AI</span></div>;
}

export function ChatThinking() {
  return <div className="meta-chat-thinking" role="status"><ChatIdentity /><span>Analyzing your data…</span><span className="meta-chat-dots" aria-hidden="true"><i /><i /><i /></span></div>;
}
