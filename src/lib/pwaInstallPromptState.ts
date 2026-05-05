/**
 * One place for `beforeinstallprompt` + deferred event so we can null it when the
 * manifest is replaced (dashboard injects a new link rel=manifest after the cookie is set).
 */

export type BeforeInstallPrompt = Event & {
  preventDefault: () => void;
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let storedBip: BeforeInstallPrompt | null = null;
let listenerAttached = false;

export function ensureGlobalBeforeInstallListener(): void {
  if (typeof window === 'undefined' || listenerAttached) return;
  listenerAttached = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    storedBip = e as BeforeInstallPrompt;
    window.dispatchEvent(new Event('larawans-pwa-bip'));
  });
}

export function getStoredBip(): BeforeInstallPrompt | null {
  return storedBip;
}

export function clearStoredBip(): void {
  storedBip = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('larawans-pwa-bip'));
  }
}
