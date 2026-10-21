import { useEffect } from 'react';

const current = (search?: string) =>
  new URLSearchParams(search ?? (typeof location === 'undefined' ? '' : location.search));

export function intParam(key: string, def: number, min: number, max: number, search?: string): number {
  const raw = current(search).get(key);
  const v = raw === null ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;
}

export function enumParam<T extends string>(
  key: string,
  allowed: readonly T[],
  def: T,
  search?: string,
): T {
  const raw = current(search).get(key);
  return allowed.includes(raw as T) ? (raw as T) : def;
}

/** Builds the query string for a module: `m` first, then the module's own params. */
export function buildQuery(moduleId: string, params: Record<string, string | number>): string {
  const p = new URLSearchParams({ m: moduleId });
  for (const [k, v] of Object.entries(params)) p.set(k, String(v));
  return `?${p.toString()}`;
}

/** Mirrors a module's state into the URL (replaceState) so any configuration can be shared. */
export function useUrlParams(moduleId: string, params: Record<string, string | number>): void {
  const query = buildQuery(moduleId, params);
  useEffect(() => {
    if (location.search !== query) history.replaceState(null, '', query);
  }, [query]);
}
