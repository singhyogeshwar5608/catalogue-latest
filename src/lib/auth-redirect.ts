import type { ApiUser } from '@/src/lib/api';

/**
 * After login/register, choose where to send the user.
 * Dashboard routes require a store; new accounts should land on create-store instead.
 */
export function resolvePostAuthRedirect(
  redirectTarget: string | null | undefined,
  user: ApiUser | null
): string {
  const target = redirectTarget?.trim() ?? '';
  const hasStore = Boolean(user?.storeSlug?.trim());

  if (target.startsWith('/')) {
    const pathOnly = target.split('?')[0];
    const isDashboardPath = pathOnly === '/dashboard' || pathOnly.startsWith('/dashboard/');

    if (hasStore && (target === '/create-store' || target.startsWith('/create-store?'))) {
      return `/store/${user!.storeSlug!}`;
    }

    if (!hasStore && isDashboardPath) {
      return '/create-store';
    }

    return target;
  }

  if (hasStore && user?.storeSlug) {
    return `/store/${user.storeSlug}`;
  }

  return '/create-store';
}
