'use client';

import {
  BadgeCheck,
  CreditCard,
  Download,
  Landmark,
  MessageCircle,
  Package,
  QrCode,
  Shield,
} from 'lucide-react';
import { checkoutQrImageSrc } from '@/src/lib/checkoutAssetUrl';

export type CartPaymentTab = 'upi' | 'card' | 'netbanking';

const TAB_GREEN = '#007A4D';

type Props = {
  activeTab: CartPaymentTab;
  onTabChange: (tab: CartPaymentTab) => void;
  cartTotal: number;
  storeUsername: string;
  paymentQrUrl: string | null;
  canPayQr: boolean;
  canPayOnline: boolean;
  formatCurrency: (value: number) => string;
  onDownloadQr?: () => void;
  qrDownloadBusy?: boolean;
  qrDownloadError?: string | null;
  onOpenQrFullscreen?: () => void;
};

function UpiAppLogos() {
  const apps = [
    { label: 'GPay', className: 'bg-white text-[#4285F4]' },
    { label: 'PhonePe', className: 'bg-[#5F259F] text-white' },
    { label: 'Paytm', className: 'bg-[#00BAF2] text-white' },
    { label: 'BHIM', className: 'bg-[#002F6C] text-white' },
  ];
  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5 sm:justify-end">
      {apps.map(({ label, className }) => (
        <span
          key={label}
          className={`rounded px-1 py-px text-[7px] font-bold leading-tight shadow-sm sm:text-[8px] ${className}`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function TrustBadgeRow() {
  const items = [
    { Icon: Shield, label: 'Secure payment' },
    { Icon: BadgeCheck, label: 'Verified seller' },
    { Icon: Package, label: 'Easy order' },
    { Icon: MessageCircle, label: 'WhatsApp help' },
  ];
  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <div className="grid grid-cols-4 gap-1 text-center sm:gap-1.5">
        {items.map(({ Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-8 sm:w-8">
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[8px] font-medium leading-tight text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CartPaymentOptionsSection({
  activeTab,
  onTabChange,
  cartTotal,
  storeUsername,
  paymentQrUrl,
  canPayQr,
  canPayOnline,
  formatCurrency,
  onDownloadQr,
  qrDownloadBusy,
  qrDownloadError,
  onOpenQrFullscreen,
}: Props) {
  const slug = storeUsername.trim() || 'seller';

  const tabs: { id: CartPaymentTab; label: string; Icon: typeof QrCode }[] = [
    { id: 'upi', label: 'UPI / QR', Icon: QrCode },
    { id: 'card', label: 'Card', Icon: CreditCard },
    { id: 'netbanking', label: 'Net Banking', Icon: Landmark },
  ];

  return (
    <div className="mt-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Payment options
      </p>

      <div className="mt-1 grid grid-cols-3 gap-1.5 sm:gap-2">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className="flex min-h-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-0.5 py-1 text-center transition sm:min-h-[3rem] sm:gap-1 sm:rounded-xl sm:px-1 sm:py-1.5"
              style={{
                borderColor: active ? TAB_GREEN : '#e2e8f0',
                color: active ? TAB_GREEN : '#64748b',
                backgroundColor: active ? 'rgba(0, 122, 77, 0.06)' : '#fff',
              }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-current sm:h-7 sm:w-7"
                style={{ backgroundColor: active ? 'rgba(0, 122, 77, 0.15)' : '#f1f5f9' }}
              >
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
              </span>
              <span className="text-[8px] font-semibold leading-tight sm:text-[9px]">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-1.5">
        {activeTab === 'upi' && (
          <div className="rounded-lg border border-slate-200/90 bg-[#f0f2f5] p-1.5 shadow-inner sm:p-2">
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2 sm:items-start">
              <div className="min-w-0">
                <p className="line-clamp-2 text-[8px] leading-tight text-slate-600">
                  Scan with any UPI app to pay.
                </p>
                <div className="mt-1 rounded-md border border-slate-200/80 bg-white p-1.5 shadow-sm">
                  <p className="text-[7px] font-semibold uppercase tracking-wide text-slate-500">
                    Amount to pay
                  </p>
                  <p className="mt-px text-sm font-bold leading-none tabular-nums text-slate-900 sm:text-[15px]">
                    {formatCurrency(cartTotal)}
                  </p>
                  <p className="mt-1 break-all text-[8px] leading-tight text-slate-700">
                    <span className="font-medium text-slate-500">UPI ID: </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {slug}@larawans
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-end">
                {canPayQr && paymentQrUrl ? (
                  <>
                    <div className="w-full max-w-[112px] rounded-md border border-white bg-white p-0.5 shadow-sm sm:max-w-[128px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={checkoutQrImageSrc(paymentQrUrl)}
                        alt="UPI QR code"
                        className="h-auto w-full object-contain"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <UpiAppLogos />
                    <div className="mt-1 flex w-full max-w-[128px] flex-col gap-1">
                      {onOpenQrFullscreen ? (
                        <button
                          type="button"
                          onClick={onOpenQrFullscreen}
                          className="w-full rounded-md border border-slate-200 bg-white py-1 text-center text-[8px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View larger
                        </button>
                      ) : null}
                      {onDownloadQr ? (
                        <button
                          type="button"
                          onClick={onDownloadQr}
                          disabled={qrDownloadBusy}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 bg-white py-1 text-[8px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Download className="h-3 w-3 shrink-0" aria-hidden />
                          {qrDownloadBusy ? 'Saving…' : 'Download'}
                        </button>
                      ) : null}
                    </div>
                    {qrDownloadError ? (
                      <p className="mt-1 max-w-[128px] text-center text-[8px] text-rose-600">
                        {qrDownloadError}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="flex min-h-[72px] w-full max-w-[128px] items-center justify-center rounded-md border border-dashed border-slate-300 bg-white/60 px-1.5 text-center text-[8px] leading-tight text-slate-500">
                    No UPI QR yet. Share cart on WhatsApp.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'card' && (
          <div className="rounded-lg border border-slate-200/90 bg-[#f0f2f5] p-2.5 sm:p-3">
            <p className="text-xs font-bold text-slate-900 sm:text-sm">Pay with card</p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-600 sm:text-xs">
              Use <span className="font-semibold text-slate-800">Pay & buy online securely</span> to pay
              with debit or credit card. A secure Razorpay checkout window will open.
            </p>
            {!canPayOnline ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Card checkout is not enabled for this store yet.
              </p>
            ) : null}
          </div>
        )}

        {activeTab === 'netbanking' && (
          <div className="rounded-lg border border-slate-200/90 bg-[#f0f2f5] p-2.5 sm:p-3">
            <p className="text-xs font-bold text-slate-900 sm:text-sm">Net banking</p>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-600 sm:text-xs">
              Tap <span className="font-semibold text-slate-800">Pay & buy online securely</span> to open
              checkout — you can choose net banking and other methods supported for this store.
            </p>
            {!canPayOnline ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Online checkout is not enabled for this store yet.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <TrustBadgeRow />
    </div>
  );
}
