'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ui/Toaster';
import { handleWebViewExternalLinkClick } from '@/lib/webview-events';

export function WebViewExternalLinks() {
  const { toast } = useToast();
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      handleWebViewExternalLinkClick(event, () => toast('Could not open this link. Please try again.', 'error'));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [toast]);
  return null;
}
