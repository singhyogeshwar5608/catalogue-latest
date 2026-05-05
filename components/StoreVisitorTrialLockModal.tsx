'use client';

import { motion } from 'framer-motion';
import { MessageCircle, Phone, Store, X } from 'lucide-react';
import type { Store as StoreType } from '@/types';

const waBtnClass =
  'mx-auto inline-flex min-h-9 w-full max-w-[200px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] px-3 py-1.5 text-sm font-semibold leading-tight text-white shadow-md transition active:scale-[0.98] hover:shadow-lg sm:max-w-[220px] sm:py-2 sm:text-[13px]';

const secondaryBtnClass =
  'mx-auto inline-flex min-h-9 w-full max-w-[200px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm font-semibold leading-tight text-slate-800 shadow-sm transition hover:bg-slate-50 active:scale-[0.98] sm:max-w-[220px] sm:py-2 sm:text-[13px]';

function formatPhoneForDisplay(raw: string | null | undefined): string {
  const t = raw?.trim();
  if (!t) return '';
  const digits = t.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return t;
}

export type StoreVisitorTrialLockModalProps = {
  store: StoreType;
  onClose: () => void;
};

/**
 * Same “store unavailable / contact owner” dialog previously shown full-page over a blurred storefront.
 * Now opened only when a visitor tries to purchase while the trial has ended without a paid plan.
 */
export default function StoreVisitorTrialLockModal({ store, onClose }: StoreVisitorTrialLockModalProps) {
  const ownerPhoneRaw = (store.phone?.trim() || store.whatsapp?.trim() || '') || '';
  const displayPhone = formatPhoneForDisplay(ownerPhoneRaw || store.whatsapp || store.phone);
  let waDigits = (store.whatsapp || store.phone || '').replace(/\D/g, '');
  if (waDigits.length === 10 && !waDigits.startsWith('91')) {
    waDigits = `91${waDigits}`;
  }
  const waLink = waDigits ? `https://wa.me/${waDigits}` : null;
  const telDigits = ownerPhoneRaw.replace(/[^\d+]/g, '');
  const telLink = telDigits ? `tel:${telDigits}` : null;
  const storeName = store.name?.trim() || 'Store';

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-lock-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-[min(100%,22rem)] min-w-0 overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-slate-100 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] ring-1 ring-black/5 sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-900"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-slate-200/80 bg-slate-200/60 px-3 py-2 sm:px-3.5 sm:py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm sm:h-10 sm:w-10">
            <Store className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-left pr-8">
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">{storeName}</p>
            <p className="text-[11px] font-medium text-slate-500 sm:text-xs">Store unavailable</p>
          </div>
        </div>

        <div className="space-y-2.5 bg-white px-3 py-3 sm:space-y-3 sm:px-3.5 sm:py-4">
          <div className="flex justify-start">
            <div className="max-w-[95%] space-y-1.5 rounded-2xl rounded-tl-md bg-slate-100 px-3 py-2.5 text-left shadow-sm ring-1 ring-slate-200/60 sm:px-3.5 sm:py-3">
              <h2 id="trial-lock-title" className="text-sm font-bold tracking-tight text-slate-900 sm:text-[15px]">
                Store unavailable
              </h2>
              <p className="text-[13px] leading-snug text-slate-600 sm:text-sm sm:leading-relaxed">
                This store can&apos;t take orders right now. Please contact the store owner using the number below.
              </p>
            </div>
          </div>

          {displayPhone ? (
            <motion.div
              className="rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2.5 text-left sm:py-3"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.28 }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">
                Owner contact
              </p>
              <p className="mt-1 break-words font-mono text-base font-bold tracking-wide text-slate-900 sm:text-lg">
                {displayPhone}
              </p>
            </motion.div>
          ) : (
            <p className="text-center text-xs text-slate-500 sm:text-sm">No phone number is listed for this store.</p>
          )}

          <div className="flex flex-col items-center gap-2 pt-0.5">
            {waLink ? (
              <motion.a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className={waBtnClass}
                whileTap={{ scale: 0.99 }}
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                Chat on WhatsApp
              </motion.a>
            ) : null}
            {telLink ? (
              <a href={telLink} className={secondaryBtnClass}>
                <Phone className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                Call owner
              </a>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
