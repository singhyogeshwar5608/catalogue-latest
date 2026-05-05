import type { Store } from '@/types';

type AuthUserLike = {
  id: string;
  storeSlug: string | null;
  stores?: { slug?: string }[];
} | null | undefined;

function collectUserStoreSlugs(user: NonNullable<AuthUserLike>): Set<string> {
  const slugSet = new Set<string>();
  const primary = user.storeSlug?.trim();
  if (primary) {
    slugSet.add(primary);
  }
  for (const s of user.stores ?? []) {
    const t = s.slug?.trim();
    if (t) {
      slugSet.add(t);
    }
  }
  return slugSet;
}

/**
 * Puts the logged-in user's own store at the front of the list when present.
 * Matches by public store path (`username`) vs `storeSlug` / `user.stores[].slug`, or `store.user.id`.
 */
export function prioritizeCurrentUserStore(list: Store[], user: AuthUserLike): Store[] {
  if (!user || list.length === 0) {
    return list;
  }

  const slugSet = collectUserStoreSlugs(user);
  const userId = user.id?.trim();

  let mineIndex = -1;
  if (slugSet.size > 0) {
    mineIndex = list.findIndex((s) => slugSet.has(s.username.trim()));
  }
  if (mineIndex < 0 && userId) {
    mineIndex = list.findIndex((s) => s.user?.id === userId);
  }

  if (mineIndex <= 0) {
    return list;
  }

  const mine = list[mineIndex];
  const rest = list.filter((_, i) => i !== mineIndex);
  return [mine, ...rest];
}
