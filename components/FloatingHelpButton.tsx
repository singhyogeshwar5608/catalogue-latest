'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

/**
 * Global help FAB — sits above the mobile bottom nav; hidden on dashboard/admin/login/help-center.
 */
export default function FloatingHelpButton() {
  const pathname = usePathname();

  const hide =
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/help-center';

  if (hide) return null;

  return (
    <Link
      href="/help-center"
      title="Help center — guides and support"
      className="floating-help-breathe pointer-events-auto fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-3 z-[50] inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-2 text-[11px] font-bold leading-none text-white shadow-[0_8px_22px_-8px_rgba(37,99,235,0.55)] ring-1 ring-blue-500/35 transition hover:bg-blue-700 hover:shadow-lg focus-visible:outline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:bottom-6 md:right-6 md:gap-2 md:px-5 md:py-3.5 md:text-base md:ring-2"
      aria-label="Help center — guides, FAQs, and support"
    >
      <HelpCircle className="h-4 w-4 shrink-0 md:h-6 md:w-6" aria-hidden />
      Help
    </Link>
  );
}
