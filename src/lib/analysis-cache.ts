import type { GeminiAnalysis } from '@/lib/types/optimize';

export const ANALYSIS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  timestamp: number;
  analysis: GeminiAnalysis;
}

export function readAnalysisCache(key: string): GeminiAnalysis | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ANALYSIS_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.analysis;
  } catch {
    return null;
  }
}

export function writeAnalysisCache(key: string, analysis: GeminiAnalysis): void {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), analysis };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — skip silently
  }
}
