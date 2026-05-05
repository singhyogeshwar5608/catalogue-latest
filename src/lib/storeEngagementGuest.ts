const STORAGE_KEY = 'catalog_store_engagement_guest_v1';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let inMemoryGuestToken: string | null = null;

function fallbackUuidV4(): string {
  // RFC4122-ish fallback when crypto.randomUUID is unavailable.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createUuidV4(): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  return fallbackUuidV4();
}

/** Stable anonymous id for store follow/like when the visitor is not logged in. */
export function getOrCreateStoreEngagementGuestToken(): string {
  if (typeof window === 'undefined') return '';
  if (inMemoryGuestToken && UUID_V4.test(inMemoryGuestToken)) {
    return inMemoryGuestToken;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && UUID_V4.test(existing)) {
      inMemoryGuestToken = existing;
      return existing;
    }
  } catch {
    // ignore storage read errors
  }

  const created = createUuidV4();
  inMemoryGuestToken = created;
  try {
    window.localStorage.setItem(STORAGE_KEY, created);
  } catch {
    // Storage can fail in strict/privacy modes; in-memory token still enables guest engagement.
  }
  return created;
}
