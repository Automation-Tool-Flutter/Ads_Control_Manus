'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** New answers must not pull someone away from the message they are reading. */
export function useChatScroll(messages: readonly unknown[], sending: boolean) {
  const container = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const scrollToLatest = useCallback(() => {
    following.current = true;
    setHasNew(false);
    const node = container.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, []);
  const onScroll = useCallback(() => {
    const node = container.current;
    if (!node) return;
    following.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
    if (following.current) setHasNew(false);
  }, []);
  useEffect(() => {
    if (following.current || !messages.length) scrollToLatest();
    else setHasNew(true);
  }, [messages, sending, scrollToLatest]);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(() => { if (following.current) node.scrollTop = node.scrollHeight; });
    observer.observe(node);
    return () => observer.disconnect();
  }, [messages.length]);
  return { container, onScroll, scrollToLatest, hasNew };
}
