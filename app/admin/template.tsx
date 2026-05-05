'use client';

/**
 * Same rationale as `app/dashboard/template.tsx`: rely on Next template remount +
 * `GoogleTranslateNavigationGuard`; avoid keyed Fragment + pathname.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return children;
}
