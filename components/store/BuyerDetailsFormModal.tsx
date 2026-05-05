'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Phone, User, Mail, FileText, Hash, X } from 'lucide-react';

export type StoreBuyerDetails = {
  fullName: string;
  phone: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  orderNotes: string;
};

export const BUYER_DETAILS_GATE_CANCELLED = 'BUYER_DETAILS_GATE_CANCELLED';

const EMPTY: StoreBuyerDetails = {
  fullName: '',
  phone: '',
  email: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  orderNotes: '',
};

export function hasValidBuyerDetails(d: StoreBuyerDetails | null | undefined): boolean {
  if (!d) return false;
  const name = d.fullName?.trim() ?? '';
  const digits = (d.phone ?? '').replace(/\D/g, '');
  return name.length >= 2 && digits.length >= 10;
}

export function razorpayPrefillFromBuyer(d: StoreBuyerDetails) {
  const contact = (d.phone ?? '').replace(/\D/g, '');
  return {
    name: d.fullName.trim(),
    email: (d.email ?? '').trim(),
    contact: contact.length >= 10 ? contact : '',
  };
}

/** Laravel `product/{id}/checkout/razorpay-order` nested `buyer` payload (snake_case). */
export type BuyerCheckoutApiPayload = {
  full_name: string;
  phone: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  order_notes?: string;
};

export function buyerToCheckoutApiPayload(d: StoreBuyerDetails): BuyerCheckoutApiPayload {
  const payload: BuyerCheckoutApiPayload = {
    full_name: d.fullName.trim(),
    phone: d.phone.trim(),
  };
  const email = d.email.trim();
  if (email) payload.email = email;
  const addressLine = d.addressLine.trim();
  if (addressLine) payload.address_line = addressLine;
  const city = d.city.trim();
  if (city) payload.city = city;
  const state = d.state.trim();
  if (state) payload.state = state;
  const pincode = d.pincode.trim();
  if (pincode) payload.pincode = pincode;
  const orderNotes = d.orderNotes.trim();
  if (orderNotes) payload.order_notes = orderNotes;
  return payload;
}

/** Hydrate from sessionStorage; supports older saved shapes (`name`, `address`, etc.). */
export function normalizeBuyerDetailsFromStorage(raw: unknown): StoreBuyerDetails | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === 'string' ? o[k] : '') as string;
  return {
    fullName: str('fullName') || str('name'),
    phone: str('phone'),
    email: str('email'),
    addressLine: str('addressLine') || str('address'),
    city: str('city'),
    state: str('state'),
    pincode: str('pincode'),
    orderNotes: str('orderNotes'),
  };
}

type BuyerDetailsFormModalProps = {
  open: boolean;
  storeName: string;
  initial: StoreBuyerDetails | null;
  accentColor?: string;
  onSubmit: (details: StoreBuyerDetails) => void;
  onDismiss: () => void;
};

export function BuyerDetailsFormModal({
  open,
  storeName,
  initial,
  accentColor = '#FF9F29',
  onSubmit,
  onDismiss,
}: BuyerDetailsFormModalProps) {
  const [form, setForm] = useState<StoreBuyerDetails>(EMPTY);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowErrors(false);
    setForm(
      initial
        ? {
            ...EMPTY,
            ...initial,
            fullName: initial.fullName ?? '',
            phone: initial.phone ?? '',
            email: initial.email ?? '',
            addressLine: initial.addressLine ?? '',
            city: initial.city ?? '',
            state: initial.state ?? '',
            pincode: initial.pincode ?? '',
            orderNotes: initial.orderNotes ?? '',
          }
        : { ...EMPTY },
    );
  }, [open, initial]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onDismiss]);

  if (!open || typeof document === 'undefined') return null;

  const fieldError = (key: keyof StoreBuyerDetails): string | null => {
    if (!showErrors) return null;
    const v = form[key]?.trim() ?? '';
    switch (key) {
      case 'fullName':
        if (v.length < 2) return 'Enter your full name';
        return null;
      case 'phone': {
        const digits = v.replace(/\D/g, '');
        if (digits.length < 10) return 'Enter a valid phone number (10+ digits)';
        return null;
      }
      case 'email':
        if (!v) return null;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email';
        return null;
      case 'pincode':
        if (!v) return null;
        if (!/^\d{4,10}$/.test(v.replace(/\s/g, ''))) return 'Enter a valid PIN / ZIP';
        return null;
      default:
        return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    const name = form.fullName.trim();
    const phoneDigits = form.phone.replace(/\D/g, '');
    const email = form.email.trim();
    const pin = form.pincode.trim().replace(/\s/g, '');
    if (name.length < 2 || phoneDigits.length < 10) return;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (pin && !/^\d{4,10}$/.test(pin)) return;
    onSubmit({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      orderNotes: form.orderNotes.trim(),
    });
  };

  const inputClass =
    'mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 sm:text-[13px] min-h-[38px]';

  const labelClass =
    'text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px]';

  const panel = (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/55 backdrop-blur-[3px]"
        aria-label="Close buyer form"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-form-title"
        className="relative z-[221] flex max-h-[min(78dvh,520px)] w-[95%] max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 shadow-[0_8px_40px_rgba(15,23,42,0.15)] sm:max-h-[min(82vh,560px)] sm:w-full sm:shadow-2xl"
      >
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-1 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, ${accentColor}, #0f172a)` }}
          aria-hidden
        />
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-slate-100 px-3 pb-2 pt-3 sm:px-5 sm:pb-2.5 sm:pt-4">
          <div className="min-w-0">
            <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[8px]">
              Checkout
            </p>
            <h2
              id="buyer-form-title"
              className="mt-0.5 text-[15px] font-bold leading-snug text-slate-900 sm:text-[17px]"
            >
              Your details
            </h2>
            <p className="mt-0.5 text-[9px] leading-snug text-slate-600 sm:text-[11px]">
              {storeName} needs this to confirm your order. You only fill this once per visit.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-5 sm:py-3"
        >
          <div className="space-y-2 sm:space-y-2.5">
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  Full name
                  <span className="font-bold text-rose-500">*</span>
                </span>
              </label>
              <input
                className={inputClass}
                name="fullName"
                autoComplete="name"
                placeholder="As on ID / bank"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                aria-invalid={Boolean(fieldError('fullName'))}
              />
              {fieldError('fullName') ? (
                <p className="mt-0.5 text-[9px] text-rose-600 sm:text-[10px]">{fieldError('fullName')}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  Phone / WhatsApp
                  <span className="font-bold text-rose-500">*</span>
                </span>
              </label>
              <input
                className={inputClass}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                aria-invalid={Boolean(fieldError('phone'))}
              />
              {fieldError('phone') ? (
                <p className="mt-0.5 text-[9px] text-rose-600 sm:text-[10px]">{fieldError('phone')}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  Email
                  <span className="font-normal normal-case text-slate-400">(optional)</span>
                </span>
              </label>
              <input
                className={inputClass}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="for receipt & updates"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                aria-invalid={Boolean(fieldError('email'))}
              />
              {fieldError('email') ? (
                <p className="mt-0.5 text-[9px] text-rose-600 sm:text-[10px]">{fieldError('email')}</p>
              ) : null}
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  Delivery address
                  <span className="font-normal normal-case text-slate-400">(optional)</span>
                </span>
              </label>
              <textarea
                className={`${inputClass} min-h-[56px] resize-y py-1.5`}
                name="addressLine"
                autoComplete="street-address"
                placeholder="Flat, street, landmark"
                rows={2}
                value={form.addressLine}
                onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
              <div>
                <label className={labelClass}>City</label>
                <input
                  className={inputClass}
                  name="city"
                  autoComplete="address-level2"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  className={inputClass}
                  name="state"
                  autoComplete="address-level1"
                  placeholder="State / province"
                  value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                    PIN code
                  </span>
                </label>
                <input
                  className={inputClass}
                  name="pincode"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="PIN / ZIP"
                  value={form.pincode}
                  onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
                  aria-invalid={Boolean(fieldError('pincode'))}
                />
                {fieldError('pincode') ? (
                  <p className="mt-0.5 text-[9px] text-rose-600 sm:text-[10px]">{fieldError('pincode')}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  Note to seller
                  <span className="font-normal normal-case text-slate-400">(optional)</span>
                </span>
              </label>
              <textarea
                className={`${inputClass} min-h-[48px] resize-y py-1.5`}
                name="orderNotes"
                placeholder="e.g. delivery time, colour preference"
                rows={2}
                value={form.orderNotes}
                onChange={(e) => setForm((f) => ({ ...f, orderNotes: e.target.value }))}
              />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-3 mt-2 border-t border-slate-100 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 sm:-mx-5 sm:px-5">
            <div className="flex flex-col-reverse gap-1.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onDismiss}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:px-4 min-h-[36px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-[11px] font-semibold text-white shadow-lg transition hover:opacity-[0.96] active:scale-[0.99] sm:w-auto sm:px-5 min-h-[36px]"
                style={{ backgroundColor: accentColor, boxShadow: `0 12px 28px ${accentColor}40` }}
              >
                Continue to payment
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
