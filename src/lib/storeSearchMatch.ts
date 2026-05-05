import type { Store } from '@/types';

/**
 * Match search text against `store.id` the same way as text fields: substring after trim + lowercase
 * (e.g. "42", "042", "123" matches id 123).
 */
export function storeSearchMatchesId(store: Store, queryLowerTrimmed: string): boolean {
  if (!queryLowerTrimmed) return false;
  if (store.id == null || store.id === '') return false;
  const idStr = String(store.id).trim().toLowerCase();
  if (!idStr) return false;
  return idStr.includes(queryLowerTrimmed);
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Client-side store filter: name, location, description, phone, WhatsApp, email, owner name, etc.
 * Use the same raw `searchQuery` from the search bar (trimmed inside).
 */
export function storeMatchesClientSearch(store: Store, query: string): boolean {
  const raw = query.trim();
  if (raw === '') return true;

  const q = raw.toLowerCase();
  if (storeSearchMatchesId(store, q)) return true;

  const includes = (value: string | null | undefined) =>
    value != null && value !== '' && value.toLowerCase().includes(q);

  const textFields: (string | null | undefined)[] = [
    store.name,
    store.description,
    store.shortDescription,
    store.location,
    store.state,
    store.district,
    store.username,
    store.businessType,
    store.categoryName,
    store.email,
    store.phone,
    store.whatsapp,
    store.user?.name,
    store.user?.email,
  ];

  if (textFields.some((v) => includes(v))) {
    return true;
  }

  /** Match catalog on the store when list payloads include products/services (home / search UX). */
  for (const p of store.products ?? []) {
    if (
      includes(p.name) ||
      includes(p.description) ||
      includes(p.category) ||
      includes(p.storeName)
    ) {
      return true;
    }
  }
  for (const s of store.services ?? []) {
    if (includes(s.title) || includes(s.description) || includes(s.storeName)) {
      return true;
    }
  }

  const qDigits = digitsOnly(raw);
  if (qDigits.length >= 3) {
    const phoneHaystacks = [store.phone, store.whatsapp].map((s) => digitsOnly(s ?? ''));
    if (phoneHaystacks.some((d) => d.includes(qDigits))) {
      return true;
    }
  }

  return false;
}

/**
 * Same as {@link storeMatchesClientSearch}, plus optional store IDs returned from `/search`
 * (when list payloads omit catalog rows but the query matched a product/service).
 */
export function storeMatchesClientSearchOrApiStores(
  store: Store,
  query: string,
  apiMatchedIds: ReadonlySet<string> | null | undefined
): boolean {
  if (storeMatchesClientSearch(store, query)) return true;
  const raw = query.trim();
  if (!raw) return true;
  if (!apiMatchedIds || apiMatchedIds.size === 0) return false;
  return apiMatchedIds.has(String(store.id));
}
