/**
 * Lightweight navigation / data timing (dev + optional prod flag).
 */
const ENABLED =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_PERF_LOG === 'true';

export function perfLog(phase: string, detail?: string): void {
  if (!ENABLED || typeof performance === 'undefined') return;
  const suffix = detail ? ` ${detail}` : '';
  console.log(`[perf:${phase}]${suffix} @ ${performance.now().toFixed(1)}ms`);
}
