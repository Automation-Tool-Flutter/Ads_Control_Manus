'use client';

import { useEffect, useRef, type FormEvent, type RefObject } from 'react';

export function ChatComposer({ value, onChange, onSubmit, ready, sending, inputRef }: {
  value: string; onChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  ready: boolean; sending: boolean; inputRef?: RefObject<HTMLTextAreaElement>;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const textarea = inputRef ?? localRef;
  useEffect(() => {
    const node = textarea.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 136)}px`;
  }, [value, textarea]);
  const disabled = !ready || sending || !value.trim();

  return <form className="meta-chat-composer" onSubmit={event => {
    event.preventDefault();
    if (!disabled) onSubmit(event);
  }}>
    <div className="meta-chat-input-wrap">
      <textarea ref={textarea} aria-label="Enter your AI question" rows={1} maxLength={1500}
        value={value} onChange={event => onChange(event.target.value)} placeholder="Message Meta AI…"
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            event.preventDefault();
            if (!disabled) event.currentTarget.form?.requestSubmit();
          }
        }} />
      <button type="submit" disabled={disabled} className="meta-chat-send" aria-label={sending ? 'Meta AI is responding' : 'Send AI question'}>
        {sending ? <span className="meta-chat-send-spinner" aria-hidden="true" /> : <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>}
      </button>
    </div>
    <p className="meta-chat-composer-note">Review AI suggestions before applying.</p>
  </form>;
}
