/** Bounded, tab-local UI memory. Never stores tokens, responses or ad mutations. */
const views = new Map<string, unknown>();
const LIMIT = 100;
export function readViewMemory<T>(key: string, fallback: T): T {
  return views.has(key) ? views.get(key) as T : fallback;
}
export function writeViewMemory<T>(key: string, value: T) {
  views.delete(key);
  views.set(key, value);
  while (views.size > LIMIT) views.delete(views.keys().next().value!);
}
export function clearViewMemory() { views.clear(); }
