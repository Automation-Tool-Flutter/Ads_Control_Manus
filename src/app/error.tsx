'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60dvh] gap-4 px-4 text-center">
      <p className="text-text-secondary">Something went wrong.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-accent text-white rounded-xl text-sm hover:bg-accent/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
