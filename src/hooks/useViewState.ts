'use client';

import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { readViewMemory, writeViewMemory } from '@/lib/view-memory';

/** Retain only UI choices across route unmounts, isolated by user and route. */
export function useViewState<T>(field: string, initial: T) {
  const pathname = usePathname();
  const { state: auth } = useAuth();
  const key = JSON.stringify([auth.user?.id ?? '', pathname, field]);
  const [snapshot, setSnapshot] = useState(() => ({ key, value: readViewMemory(key, initial) }));
  const value = snapshot.key === key ? snapshot.value : readViewMemory(key, initial);
  useEffect(() => { if (auth.user) writeViewMemory(key, value); }, [key, value, auth.user]);
  const setValue = useCallback((action: SetStateAction<T>) => {
    setSnapshot(previous => {
      const current = previous.key === key ? previous.value : readViewMemory(key, initial);
      const next = typeof action === 'function' ? (action as (value: T) => T)(current) : action;
      return { key, value: next };
    });
  }, [key, initial]);
  return [value, setValue] as const;
}
