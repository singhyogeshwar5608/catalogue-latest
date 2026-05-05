import type { ReactNode } from 'react';

/** Shell only; remount behavior is handled by `app/dashboard/template.tsx`. */
export default function DashboardMain({ children }: { children: ReactNode }) {
  return (
    <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-28 pt-[max(5.25rem,env(safe-area-inset-top,0px)+4.25rem)] md:ml-64 md:p-8 md:pb-10 md:pt-3">
      {children}
    </main>
  );
}
