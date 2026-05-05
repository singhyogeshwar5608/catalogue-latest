'use client';

/**
 * Next.js `template.tsx` already remounts this subtree on each segment navigation.
 * Do not add an extra `key={pathname}` on a wrapper: it forces a second full teardown
 * during the same transition and can trigger React `removeChild` errors when the DOM
 * was touched by Google Translate, browser extensions, or similar.
 *
 * Merchant routes also use full reloads where needed via `GoogleTranslateNavigationGuard`.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return children;
}
