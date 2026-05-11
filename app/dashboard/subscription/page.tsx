"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Crown,
  Loader2,
  Calendar,
  AlertCircle,
  X,
  Info,
  Sparkles,
  QrCode,
  CreditCard,
  Building2,
  Download,
  Phone,
} from "lucide-react";
import {
  getSubscriptionPlanCatalog,
  getStoreSubscription,
  activateStoreSubscription,
  getStoredUser,
  getStoreBySlugFromApi,
  getMyStores,
  isApiError,
  getSubscriptionAddonPrices,
  saveStoreSubscriptionAddons,
  updateStorePaymentIntegration,
  requestUpgradeInquiry,
  createStoreSubscriptionRazorpayOrder,
  verifyStoreSubscriptionRazorpayPayment,
  completeStoreSubscriptionMockPayment,
} from "@/src/lib/api";
import { useStoreSelection } from "@/src/context/StoreContext";
import type {
  Store,
  SubscriptionPlan,
  StoreSubscription,
  SubscriptionCheckoutPricing,
  StoreSubscriptionAddons,
} from "@/types";
import { ensureStoreTrialEndsAt } from "@/src/lib/freeTrialDays";
import { dispatchStoreProfileRefresh } from "@/src/lib/storeSubscriptionAddons";
import { loadRazorpayCheckoutScript } from "@/src/lib/razorpayCheckoutScript";
import faviconIcon from "@/assets/icon-512x512.svg";

/**
 * Mock checkout button is shown in all environments unless explicitly hidden.
 * Hide everywhere: `NEXT_PUBLIC_SUBSCRIPTION_MOCK_PAYMENT=false` at build time.
 * Lock API to real payments only: `SUBSCRIPTION_MOCK_PAYMENT=false` in Laravel `backend/.env`.
 */
const SUBSCRIPTION_MOCK_PAYMENT_UI =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SUBSCRIPTION_MOCK_PAYMENT !== "false";

/**
 * GST on subscription checkout taxable amount (after billing-term discount, on plan + add-ons gross).
 * Must match backend `SubscriptionCheckoutPricing::GST_PERCENT`.
 */
const SUBSCRIPTION_CHECKOUT_GST_PERCENT = 18;

/**
 * Same rules as `App\Support\SubscriptionCheckoutPricing`: explicit tier → price-rank (3+ similar plans) → duration.
 * `catalog` should be the loaded plan list (e.g. dashboard catalog).
 */
const subscriptionBillingDiscountPercentForPlan = (
  plan: SubscriptionPlan,
  pricing: SubscriptionCheckoutPricing | null,
  catalog: SubscriptionPlan[],
): number => {
  if (!pricing) return 0;
  const t = plan.billingDiscountTier;
  if (t === "one_month") return pricing.discount_1_month_pct;
  if (t === "three_months") return pricing.discount_3_months_pct;
  if (t === "one_year") return pricing.discount_1_year_pct;

  const rankPct = billingDiscountPercentFromPaidPlanPriceRank(
    plan,
    pricing,
    catalog,
  );
  if (rankPct !== null) return rankPct;

  const d = plan.durationDays && plan.durationDays > 0 ? plan.durationDays : 0;
  const cycle = plan.billingCycle ?? "monthly";
  if (cycle === "yearly" || d >= 330) return pricing.discount_1_year_pct;
  if (d >= 60 && d < 330) return pricing.discount_3_months_pct;
  return pricing.discount_1_month_pct;
};

/** Mirrors backend `SubscriptionCheckoutPricing::billingDiscountPercentFromPaidPlanPriceRank`. */
const billingDiscountPercentFromPaidPlanPriceRank = (
  plan: SubscriptionPlan,
  pricing: SubscriptionCheckoutPricing,
  catalog: SubscriptionPlan[],
): number | null => {
  if (Number(plan.price) <= 0 || plan.isActive === false) return null;
  if ((plan.billingCycle ?? "monthly") === "yearly") return null;
  const d =
    plan.durationDays != null && plan.durationDays > 0 ? plan.durationDays : 0;
  if (d > 45) return null;

  const candidates = catalog
    .filter(
      (p) =>
        p.isActive !== false &&
        Number(p.price) > 0 &&
        (p.billingCycle ?? "monthly") !== "yearly" &&
        (() => {
          const pd =
            p.durationDays != null && p.durationDays > 0 ? p.durationDays : 0;
          return pd <= 45;
        })(),
    )
    .sort(
      (a, b) =>
        Number(a.price) - Number(b.price) ||
        String(a.id).localeCompare(String(b.id)),
    );

  const n = candidates.length;
  if (n < 2) return null;
  const idx = candidates.findIndex((p) => p.id === plan.id);
  if (idx < 0) return null;
  if (n === 2) {
    return idx === 0
      ? pricing.discount_1_month_pct
      : pricing.discount_1_year_pct;
  }
  if (idx === 0) return pricing.discount_1_month_pct;
  if (idx === 1) return pricing.discount_3_months_pct;
  return pricing.discount_1_year_pct;
};

const sumSelectedAddonRupees = (
  addons: StoreSubscriptionAddons,
  pricing: SubscriptionCheckoutPricing | null,
): number => {
  if (!pricing) return 0;
  // Only QR code impacts payable amount. Other toggles are inquiry-only.
  return addons.qrCode ? pricing.qr_code_inr : 0;
};

/** Same math as the confirm modal and Laravel `StoreSubscriptionRazorpayController::createOrder`. */
const computeSubscriptionCheckoutTotals = (
  plan: SubscriptionPlan,
  addons: StoreSubscriptionAddons,
  pricing: SubscriptionCheckoutPricing | null,
  catalog: SubscriptionPlan[],
) => {
  if (!pricing) return null;
  const base = Number(plan.price) || 0;
  const addonSum = sumSelectedAddonRupees(addons, pricing);
  const grossSubtotal = base + addonSum;
  const discountPct = subscriptionBillingDiscountPercentForPlan(
    plan,
    pricing,
    catalog,
  );
  const discountRupees =
    grossSubtotal > 0 && discountPct > 0
      ? Math.round(grossSubtotal * (discountPct / 100))
      : 0;
  const taxableSubtotal = Math.max(0, grossSubtotal - discountRupees);
  const gstAmount = Math.round(
    taxableSubtotal * (SUBSCRIPTION_CHECKOUT_GST_PERCENT / 100),
  );
  const grandTotal = taxableSubtotal + gstAmount;
  return {
    grossSubtotal,
    discountPct,
    discountRupees,
    taxableSubtotal,
    gstAmount,
    grandTotal,
  };
};

const formatPlanDuration = (durationDays?: number, billingCycle?: string) => {
  if (!durationDays || durationDays <= 0) {
    return billingCycle ?? "cycle";
  }

  if (durationDays % 365 === 0) {
    const years = durationDays / 365;
    return years === 1 ? "year" : `${years} years`;
  }

  if (durationDays % 30 === 0) {
    const months = durationDays / 30;
    return months === 1 ? "month" : `${months} months`;
  }

  if (durationDays === 7) {
    return "week";
  }

  return `${durationDays} days`;
};

type InvoiceStoreSnapshot = {
  name: string;
  username: string;
  location: string;
  state?: string | null;
  district?: string | null;
  phone?: string;
  email?: string;
  whatsapp?: string;
};

type SubscriptionCheckoutTotals = NonNullable<
  ReturnType<typeof computeSubscriptionCheckoutTotals>
>;

type PaymentSuccessInvoiceSnapshot = {
  subscription: StoreSubscription;
  plan: SubscriptionPlan;
  addons: StoreSubscriptionAddons;
  totals: SubscriptionCheckoutTotals;
  method: "razorpay" | "mock";
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paidAtIso: string;
};

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const addonInvoiceRows = (
  addons: StoreSubscriptionAddons,
  pricing: SubscriptionCheckoutPricing | null,
): { label: string; amount: number }[] => {
  if (!pricing) return [];
  const rows: { label: string; amount: number }[] = [];
  if (addons.qrCode && pricing.qr_code_inr > 0) {
    rows.push({ label: "QR code", amount: pricing.qr_code_inr });
  }
  return rows;
};

function triggerHtmlInvoiceDownload(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildSubscriptionInvoiceHtml(args: {
  store: InvoiceStoreSnapshot | null;
  subscription: StoreSubscription;
  plan: SubscriptionPlan;
  addons: StoreSubscriptionAddons;
  totals: SubscriptionCheckoutTotals;
  pricing: SubscriptionCheckoutPricing | null;
  method: "razorpay" | "mock";
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paidAtIso: string;
}): string {
  const {
    store,
    subscription,
    plan,
    addons,
    totals,
    pricing,
    method,
    razorpayPaymentId,
    razorpayOrderId,
    paidAtIso,
  } = args;
  const base = Number(plan.price) || 0;
  const addonRows = addonInvoiceRows(addons, pricing);
  const paid = new Date(paidAtIso);
  const paidStr = Number.isNaN(paid.getTime())
    ? paidAtIso
    : paid.toLocaleString("en-IN");
  const region = [store?.district, store?.state].filter(Boolean).join(", ");
  const ynBadge = (on: boolean) =>
    on
      ? '<span class="badge badge-yes" aria-label="Enabled">Yes</span>'
      : '<span class="badge badge-no" aria-label="Not enabled">No</span>';

  const storeLeft: string[] = [];
  const storeRight: string[] = [];
  if (store?.name) {
    storeLeft.push(
      `<div class="kv"><span class="k">Store</span><span class="v">${escapeHtml(store.name)}</span></div>`,
    );
  }
  if (store?.username) {
    storeLeft.push(
      `<div class="kv"><span class="k">Store URL</span><span class="v">/${escapeHtml(store.username)}</span></div>`,
    );
  }
  if (store?.location) {
    storeLeft.push(
      `<div class="kv"><span class="k">Location</span><span class="v">${escapeHtml(store.location)}</span></div>`,
    );
  }
  if (region) {
    storeLeft.push(
      `<div class="kv"><span class="k">Area</span><span class="v">${escapeHtml(region)}</span></div>`,
    );
  }
  if (store?.phone) {
    storeRight.push(
      `<div class="kv"><span class="k">Phone</span><span class="v">${escapeHtml(store.phone)}</span></div>`,
    );
  }
  if (store?.whatsapp) {
    storeRight.push(
      `<div class="kv"><span class="k">WhatsApp</span><span class="v">${escapeHtml(store.whatsapp)}</span></div>`,
    );
  }
  if (store?.email) {
    storeRight.push(
      `<div class="kv"><span class="k">Email</span><span class="v">${escapeHtml(store.email)}</span></div>`,
    );
  }
  const hasStoreBlock = storeLeft.length > 0 || storeRight.length > 0;
  const storeGridClass =
    storeLeft.length > 0 && storeRight.length > 0
      ? "store-grid"
      : "store-grid store-grid-single";
  const storeSectionHtml = hasStoreBlock
    ? `<div class="box store-box">
    <p class="box-h">Store details</p>
    <div class="${storeGridClass}">
      <div class="store-col">${storeLeft.join("")}</div>
      <div class="store-col">${storeRight.join("")}</div>
    </div>
  </div>`
    : "";

  const addonRowsHtml = addonRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td style="text-align:right">₹${escapeHtml(String(Math.round(r.amount)))}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Larawans — Subscription payment receipt</title>
<style>
  *,*::before,*::after{box-sizing:border-box;}
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:10px 12px;color:#0f172a;max-width:640px;margin-left:auto;margin-right:auto;line-height:1.35;font-size:13px;}
  .doc-header{margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid #d97706;}
  .doc-heading{margin:0;font-weight:normal;line-height:1.2;}
  .brand{display:block;font-size:1.35rem;font-weight:800;letter-spacing:-0.02em;color:#b45309;}
  .doc-title{display:block;font-size:0.95rem;font-weight:600;color:#1e293b;margin-top:4px;}
  .doc-tagline{font-size:0.7rem;color:#64748b;margin:4px 0 0 0;}
  .muted{color:#64748b;font-size:0.72rem;margin:6px 0 0 0;}
  .box-h{margin:0 0 6px 0;font-size:0.65rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;}
  .box{border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin:6px 0;background:#f8fafc;}
  .plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px;font-size:0.8rem;}
  @media (max-width:480px){.plan-grid{grid-template-columns:1fr;}}
  .kv{display:flex;flex-direction:column;gap:1px;}
  .kv .k{font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;}
  .kv .v{font-size:0.78rem;color:#0f172a;word-break:break-word;}
  .store-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;align-items:start;}
  .store-grid-single{grid-template-columns:1fr;}
  @media (max-width:480px){.store-grid:not(.store-grid-single){grid-template-columns:1fr;}}
  .store-col{display:flex;flex-direction:column;gap:6px;min-width:0;}
  table{width:100%;border-collapse:collapse;margin:6px 0;}
  th,td{padding:3px 4px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:0.78rem;}
  th{border-bottom:2px solid #cbd5e1;padding-bottom:4px;font-size:0.68rem;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;}
  .total td{font-weight:700;font-size:0.85rem;border-bottom:none;padding-top:6px;}
  .addons-list{display:flex;flex-direction:column;gap:5px;margin-top:4px;}
  .addon-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.78rem;min-height:1.5em;}
  .addon-name{color:#334155;flex:1;min-width:0;}
  .badge{display:inline-flex;align-items:center;justify-content:center;min-width:2.5rem;padding:2px 8px;border-radius:999px;font-size:0.65rem;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;flex-shrink:0;}
  .badge-yes{background:linear-gradient(180deg,#dcfce7,#bbf7d0);color:#14532d;border:1px solid #86efac;}
  .badge-no{background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;}
  .foot{margin:8px 0 0 0;}
  @media print{
    body{padding:8px;font-size:11pt;max-width:none;}
    .doc-header{border-bottom-color:#94a3b8;}
  }
</style>
</head>
<body>
  <header class="doc-header">
    <h1 class="doc-heading">
      <span class="brand">Larawans</span>
      <span class="doc-title">Subscription payment receipt</span>
    </h1>
    <p class="doc-tagline">Official summary of your store subscription payment on the Larawans platform.</p>
    <p class="muted">Paid: ${escapeHtml(paidStr)} · ${method === "mock" ? "Mock payment (test)" : "Razorpay"}</p>
  </header>
  <div class="box">
    <p class="box-h">Subscription</p>
    <div class="plan-grid">
      <div class="kv"><span class="k">Plan</span><span class="v">${escapeHtml(plan.name)}</span></div>
      <div class="kv"><span class="k">Period</span><span class="v">${escapeHtml(new Date(subscription.startsAt).toLocaleDateString("en-IN"))} → ${escapeHtml(new Date(subscription.endsAt).toLocaleDateString("en-IN"))}</span></div>
      <div class="kv"><span class="k">Subscription ID</span><span class="v">${escapeHtml(subscription.id)}</span></div>
    </div>
  </div>
  ${storeSectionHtml}
  <table>
    <thead><tr><th>Description</th><th style="text-align:right">Amount (INR)</th></tr></thead>
    <tbody>
      <tr><td>Plan (${escapeHtml(formatPlanDuration(plan.durationDays, plan.billingCycle))})</td><td style="text-align:right">₹${escapeHtml(String(Math.round(base)))}</td></tr>
      ${addonRowsHtml}
      <tr><td>Subtotal (base + add-ons)</td><td style="text-align:right">₹${escapeHtml(String(Math.round(totals.grossSubtotal)))}</td></tr>
      <tr><td>Billing discount (${totals.discountPct}%)</td><td style="text-align:right">${totals.discountRupees > 0 ? "−" : ""}₹${escapeHtml(String(Math.round(totals.discountRupees)))}</td></tr>
      <tr><td>Amount before GST</td><td style="text-align:right">₹${escapeHtml(String(Math.round(totals.taxableSubtotal)))}</td></tr>
      <tr><td>GST (${SUBSCRIPTION_CHECKOUT_GST_PERCENT}%)</td><td style="text-align:right">₹${escapeHtml(String(Math.round(totals.gstAmount)))}</td></tr>
      <tr class="total"><td>Total paid</td><td style="text-align:right">₹${escapeHtml(String(Math.round(totals.grandTotal)))}</td></tr>
    </tbody>
  </table>
  <div class="box">
    <p class="box-h">Add-ons</p>
    <div class="addons-list">
      <div class="addon-row">
        <span class="addon-name">Payment gateway integration</span>
        ${ynBadge(addons.paymentGateway)}
      </div>
      <div class="addon-row">
        <span class="addon-name">QR code</span>
        ${ynBadge(addons.qrCode)}
      </div>
      <div class="addon-row">
        <span class="addon-name">Payment gateway — company help</span>
        ${ynBadge(addons.paymentGatewayHelp)}
      </div>
    </div>
  </div>
  ${
    method === "razorpay" && (razorpayPaymentId || razorpayOrderId)
      ? `<div class="box">
          <p class="box-h">Razorpay</p>
          ${razorpayPaymentId ? `<div class="kv" style="margin-top:4px"><span class="k">Payment ID</span><span class="v" style="font-size:0.72rem">${escapeHtml(razorpayPaymentId)}</span></div>` : ""}
          ${razorpayOrderId ? `<div class="kv" style="margin-top:4px"><span class="k">Order ID</span><span class="v" style="font-size:0.72rem">${escapeHtml(razorpayOrderId)}</span></div>` : ""}
        </div>`
      : ""
  }
  <p class="muted foot">Print → Save as PDF from your browser for a PDF copy.</p>
</body>
</html>`;
}

/** Whole calendar days from local midnight today to the subscription end date (date part of `endsAt` ISO). */
const getCalendarDaysRemaining = (endsAtIso: string): number => {
  const end = new Date(endsAtIso);
  if (Number.isNaN(end.getTime())) return 0;
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round(
    (endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24),
  );
};

const remainingDaysText = (endsAtIso: string): string => {
  const d = getCalendarDaysRemaining(endsAtIso);
  if (d > 1) return `${d} days remaining`;
  if (d === 1) return "1 day remaining";
  if (d === 0) return "Expires today";
  if (d === -1) return "Expired (1 day ago)";
  return `Expired (${Math.abs(d)} days ago)`;
};

const remainingDaysClass = (endsAtIso: string): string => {
  const d = getCalendarDaysRemaining(endsAtIso);
  if (d < 0) return "text-red-700";
  if (d <= 3) return "text-amber-800";
  return "text-gray-900";
};

/** When Laravel omits the default `active_subscription` row, the store can still be in the platform free-trial window. */
function isFreeTrialPeriodOpen(store: Store | null): boolean {
  if (store?.lifetimeAccess) return false;
  if (!store?.trialEndsAt) return false;
  const t = new Date(store.trialEndsAt).getTime();
  return !Number.isNaN(t) && t > Date.now();
}

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(n)),
  );

/** Hide free-trial marketing lines when the store is on a paid subscription period. */
const TRIAL_FEATURE_LINE = /\btrial\b|free\s*trial|\d+\s*days?\s*trial/i;

const featuresWithoutTrialHints = (features: string[]): string[] =>
  features.filter((line) => !TRIAL_FEATURE_LINE.test(line));

function AddonToggleRow({
  icon: Icon,
  title,
  hint,
  priceInr,
  checked,
  onToggle,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  priceInr: number;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-0 py-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-700">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-tight text-slate-900">
            {title}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-slate-500">
            {hint}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {priceInr > 0 ? (
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            +₹{formatInr(priceInr)}
          </span>
        ) : null}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={onToggle}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 ${
            checked ? "bg-primary" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
              checked ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { selectedStore } = useStoreSelection();

  const resolveMerchantStoreSlug = useCallback(async (): Promise<
    string | null
  > => {
    const trim = (v: string | null | undefined) => (v ?? "").trim();
    const fromContext = trim(selectedStore?.slug);
    if (fromContext) return fromContext;
    const user = getStoredUser();
    const fromUser = trim(user?.storeSlug);
    if (fromUser) return fromUser;
    try {
      const stores = await getMyStores();
      if (!stores.length) return null;
      const prefer = trim(user?.storeSlug);
      if (prefer) {
        const byUsername = stores.find((s) => s.username === prefer);
        const byId = stores.find((s) => String(s.id) === prefer);
        const pick = byUsername ?? byId ?? stores[0];
        return trim(pick.username) || null;
      }
      return trim(stores[0].username) || null;
    } catch {
      return null;
    }
  }, [selectedStore?.slug]);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeSubscription, setActiveSubscription] =
    useState<StoreSubscription | null>(null);
  /** Used when GET `/subscription` is empty but the store is still in the free-trial period. */
  const [storeProfile, setStoreProfile] = useState<Store | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  /** Paid-plan / checkout messaging; does not replace the whole page (unlike fatal `error`). */
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(
    null,
  );
  const [activationError, setActivationError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  /** Plan chosen via “Choose plan” — checkout summary + add-on toggles. */
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [checkoutConfirmOpen, setCheckoutConfirmOpen] = useState(false);
  const [upgradeConfirmOpen, setUpgradeConfirmOpen] = useState(false);
  const [upgradeSuccessOpen, setUpgradeSuccessOpen] = useState(false);
  const [addonPrices, setAddonPrices] =
    useState<SubscriptionCheckoutPricing | null>(null);
  const [addonPricesLoading, setAddonPricesLoading] = useState(false);
  /** Add-on selection is per-plan card (so toggling one card doesn't toggle all). */
  const [addonsByPlanId, setAddonsByPlanId] = useState<
    Record<string, StoreSubscriptionAddons>
  >({});
  /** Add-ons currently saved on the store (used as default when a plan card has no local selection yet). */
  const [hydratedStoreAddons, setHydratedStoreAddons] =
    useState<StoreSubscriptionAddons>({
      paymentGateway: false,
      qrCode: false,
      paymentGatewayHelp: false,
    });
  /** After live load of `subscription_addons` from API; toggles disabled until true to avoid races. */
  const [addonHydrated, setAddonHydrated] = useState(false);
  const [qrUploadOpen, setQrUploadOpen] = useState(false);
  const [qrUploadPlanId, setQrUploadPlanId] = useState<string | null>(null);
  const [qrUploadBase64, setQrUploadBase64] = useState<string | null>(null);
  const [qrUploadMime, setQrUploadMime] = useState<string | null>(null);
  const [qrUploadPreviewUrl, setQrUploadPreviewUrl] = useState<string | null>(
    null,
  );
  const [qrUploadError, setQrUploadError] = useState<string | null>(null);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrUploadToast, setQrUploadToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeModalButtonRef = useRef<HTMLButtonElement>(null);
  /** Prevents Mock + Razorpay flows from running together if clicks fire close together. */
  const subscriptionCheckoutLockRef = useRef(false);
  const [invoiceStoreSnapshot, setInvoiceStoreSnapshot] =
    useState<InvoiceStoreSnapshot | null>(null);
  const [paymentSuccessInvoice, setPaymentSuccessInvoice] =
    useState<PaymentSuccessInvoiceSnapshot | null>(null);
  const paymentSuccessCloseRef = useRef<HTMLButtonElement>(null);

  const openPlanModal = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const closePlanModal = () => {
    setSelectedPlan(null);
  };

  const closeCheckoutConfirm = () => setCheckoutConfirmOpen(false);

  const closeQrUpload = () => {
    setQrUploadOpen(false);
    setQrUploadPlanId(null);
    setQrUploadBase64(null);
    setQrUploadMime(null);
    setQrUploadPreviewUrl(null);
    setQrUploadError(null);
    setQrUploading(false);
  };

  const handlePlanCardKeyDown = (e: KeyboardEvent, plan: SubscriptionPlan) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPlanModal(plan);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!qrUploadToast) return;
    const t = window.setTimeout(() => setQrUploadToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [qrUploadToast]);

  useEffect(() => {
    if (!selectedPlan) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") closePlanModal();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      closeModalButtonRef.current?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [selectedPlan]);

  useEffect(() => {
    if (!checkoutPlan) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (checkoutConfirmOpen) {
          setCheckoutConfirmOpen(false);
          return;
        }
        setCheckoutPlan(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [checkoutPlan, checkoutConfirmOpen]);

  useEffect(() => {
    if (!paymentSuccessInvoice) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setPaymentSuccessInvoice(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(
      () => paymentSuccessCloseRef.current?.focus(),
      0,
    );
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [paymentSuccessInvoice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAddonPricesLoading(true);
      try {
        const p = await getSubscriptionAddonPrices();
        if (!cancelled) setAddonPrices(p);
      } catch {
        if (!cancelled) {
          setAddonPrices({
            payment_gateway_integration_inr: 0,
            qr_code_inr: 0,
            payment_gateway_help_inr: 0,
            discount_1_month_pct: 0,
            discount_3_months_pct: 0,
            discount_1_year_pct: 0,
          });
        }
      } finally {
        if (!cancelled) setAddonPricesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAddonHydrated(false);
    (async () => {
      const slug = await resolveMerchantStoreSlug();
      if (!slug) {
        if (!cancelled) setAddonHydrated(true);
        return;
      }
      try {
        const s = await getStoreBySlugFromApi(slug);
        if (cancelled) return;
        const a = s.subscriptionAddons;
        setHydratedStoreAddons({
          paymentGateway: Boolean(a?.paymentGateway),
          qrCode: Boolean(a?.qrCode),
          paymentGatewayHelp: Boolean(a?.paymentGatewayHelp),
        });
      } catch {
        if (!cancelled) {
          setHydratedStoreAddons({
            paymentGateway: false,
            qrCode: false,
            paymentGatewayHelp: false,
          });
        }
      } finally {
        if (!cancelled) setAddonHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, resolveMerchantStoreSlug]);

  /** Save add-ons as soon as toggles change (after hydrate); Payment settings nav still requires an active paid period. */
  const checkoutPlanId = checkoutPlan?.id;
  useEffect(() => {
    // Only persist add-ons when the user is in the real paid checkout flow.
    // Upgrade-inquiry flow (partial QR/PG) must not unlock payment settings.
    if (!checkoutConfirmOpen || !checkoutPlanId || !storeId || !addonHydrated) {
      return undefined;
    }
    const selection = addonsByPlanId[checkoutPlanId] ?? hydratedStoreAddons;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          await saveStoreSubscriptionAddons(storeId, {
            paymentGateway: Boolean(selection.paymentGateway),
            qrCode: Boolean(selection.qrCode),
            paymentGatewayHelp: Boolean(selection.paymentGatewayHelp),
          });
          dispatchStoreProfileRefresh();
        } catch (err) {
          setActivationError(
            err instanceof Error
              ? err.message
              : "Could not save add-on selection. Run migrations if this is new.",
          );
        }
      })();
    }, 420);
    return () => window.clearTimeout(t);
  }, [
    addonsByPlanId,
    hydratedStoreAddons,
    addonHydrated,
    checkoutConfirmOpen,
    checkoutPlanId,
    storeId,
  ]);

  const loadSubscriptionPageData = useCallback(async () => {
    try {
      setLoading(true);
      setSubscriptionNotice(null);
      const fetchedPlans = await getSubscriptionPlanCatalog();
      setPlans(fetchedPlans);

      const slug = await resolveMerchantStoreSlug();
      if (!slug) {
        setError("No store found for this user");
        return;
      }

      // Laravel direct (not Next Redis) so new store + default free subscription are visible immediately.
      const rawStore = await getStoreBySlugFromApi(slug);
      if (!rawStore) {
        setError("Store not found");
        return;
      }

      const store = ensureStoreTrialEndsAt(rawStore);
      setStoreProfile(store);

      setStoreId(store.id);
      setInvoiceStoreSnapshot({
        name: store.name,
        username: store.username,
        location: store.location ?? "",
        state: store.state ?? null,
        district: store.district ?? null,
        phone: store.phone ?? "",
        email: store.email ?? "",
        whatsapp: store.whatsapp ?? "",
      });
      let activeSub: StoreSubscription | null = null;
      try {
        const subRes = await getStoreSubscription(store.id);
        activeSub = subRes.activeSubscription ?? null;
      } catch (subErr) {
        // Laravel may return 403 for this route while the public store payload still includes
        // `activeSubscription` (dashboard main page uses the same pattern with graceful fallback).
        if (isApiError(subErr) && subErr.status === 403) {
          activeSub = store.activeSubscription ?? null;
          setSubscriptionNotice(
            activeSub
              ? "Subscription details were loaded from your store profile. If renewal dates look wrong, ask support to allow GET /stores/{id}/subscription for store owners."
              : "Could not load subscription details from the server (access denied). You can still browse plans below.",
          );
        } else {
          throw subErr;
        }
      }
      setActiveSubscription(activeSub ?? store.activeSubscription ?? null);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subscription data",
      );
    } finally {
      setLoading(false);
    }
  }, [resolveMerchantStoreSlug]);

  useEffect(() => {
    void loadSubscriptionPageData();
  }, [loadSubscriptionPageData]);

  const orderedPlans = useMemo(() => {
    // Keep API order stable, but force the free plan to be the first card.
    const withIndex = plans.map((plan, index) => ({ plan, index }));
    const isFree = (p: SubscriptionPlan) => {
      const slug = String(p.slug ?? "")
        .trim()
        .toLowerCase();
      if (slug === "free") return true;
      return Number(p.price) <= 0;
    };
    withIndex.sort((a, b) => {
      const af = isFree(a.plan);
      const bf = isFree(b.plan);
      if (af !== bf) return af ? -1 : 1;
      return a.index - b.index;
    });
    return withIndex.map((x) => x.plan);
  }, [plans]);

  const checkoutAddonPayload = (
    planId?: string | null,
  ): StoreSubscriptionAddons => {
    const id = planId ?? checkoutPlan?.id ?? null;
    if (!id) return hydratedStoreAddons;
    return addonsByPlanId[id] ?? hydratedStoreAddons;
  };

  const showPaidSubscriptionSuccess = useCallback(
    (
      subscription: StoreSubscription,
      plan: SubscriptionPlan,
      addons: StoreSubscriptionAddons,
      method: "razorpay" | "mock",
      razorpay?: { paymentId?: string; orderId?: string },
    ) => {
      const totals = computeSubscriptionCheckoutTotals(
        plan,
        addons,
        addonPrices,
        plans,
      );
      if (totals) {
        setPaymentSuccessInvoice({
          subscription,
          plan,
          addons,
          totals,
          method,
          razorpayPaymentId: razorpay?.paymentId,
          razorpayOrderId: razorpay?.orderId,
          paidAtIso: new Date().toISOString(),
        });
        setSuccessMessage(null);
      } else {
        setSuccessMessage(
          method === "mock"
            ? `✅ Mock payment successful! You are now on the ${subscription.plan.name} plan.`
            : `✅ Payment successful! You are now on the ${subscription.plan.name} plan.`,
        );
      }
    },
    [addonPrices, plans],
  );

  const handleActivatePlan = async (
    plan: SubscriptionPlan,
    addons?: StoreSubscriptionAddons,
  ) => {
    if (!storeId) return;
    if (storeProfile?.lifetimeAccess) {
      return;
    }
    if (activeSubscription && activeSubscription.plan.id === plan.id) {
      return;
    }

    const planPrice = Number(plan.price);
    if (planPrice > 0) {
      setCheckoutPlan(null);
      setSubscriptionNotice(
        "This is a paid plan. Your current subscription stays the same until checkout and payment are completed. (Payment step is not connected yet.)",
      );
      setActivationError(null);
      setSuccessMessage(null);
      return;
    }

    setActivatingPlanId(plan.id);
    setSuccessMessage(null);
    setSubscriptionNotice(null);
    setActivationError(null);
    setError(null);
    try {
      const subscription = await activateStoreSubscription(storeId, {
        planId: plan.id,
        addons: addons ?? {
          paymentGateway: false,
          qrCode: false,
          paymentGatewayHelp: false,
        },
      });
      setActiveSubscription(subscription);
      setSelectedPlan((p) => (p?.id === plan.id ? null : p));
      setCheckoutPlan(null);
      dispatchStoreProfileRefresh();
      const messagePrefix = activeSubscription
        ? "🚀 Plan upgraded!"
        : "✅ Subscription activated!";
      setSuccessMessage(
        `${messagePrefix} You're now on the ${plan.name} plan.`,
      );
    } catch (err) {
      if (isApiError(err) && err.status === 402) {
        setSubscriptionNotice(
          err.message ||
            "Paid plans require checkout. Your active subscription will not change until payment succeeds.",
        );
      } else if (isApiError(err) && err.status === 409) {
        setSubscriptionNotice(
          err.message ||
            "This change is not allowed for your current subscription.",
        );
      } else {
        setActivationError(
          err instanceof Error
            ? err.message
            : "Failed to activate subscription",
        );
      }
    } finally {
      setActivatingPlanId(null);
    }
  };

  const proceedPaidPlanCheckout = async (planOverride?: SubscriptionPlan) => {
    const plan = planOverride ?? checkoutPlan;
    if (!plan || !storeId) return;
    if (storeProfile?.lifetimeAccess) {
      return;
    }
    if (subscriptionCheckoutLockRef.current) return;
    subscriptionCheckoutLockRef.current = true;
    const addons = checkoutAddonPayload(plan.id);
    setActivatingPlanId(plan.id);
    setActivationError(null);
    setSuccessMessage(null);
    try {
      await saveStoreSubscriptionAddons(storeId, addons);
      dispatchStoreProfileRefresh();

      const order = await createStoreSubscriptionRazorpayOrder(storeId, {
        planId: plan.id,
        addons,
      });

      const localTotals = computeSubscriptionCheckoutTotals(
        plan,
        addons,
        addonPrices,
        plans,
      );
      if (localTotals) {
        const serverRupees =
          order.pricing?.totalRupees ?? Math.round(Number(order.amount) / 100);
        if (serverRupees !== localTotals.grandTotal) {
          throw new Error(
            "Payment amount (server Rs. " +
              serverRupees +
              ") does not match the page total (Rs. " +
              localTotals.grandTotal +
              "). Deploy the latest Laravel backend for subscription checkout (billing discount + GST), restart PHP, then try again.",
          );
        }
      }

      await loadRazorpayCheckoutScript();

      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        throw new Error(
          "Razorpay checkout is unavailable. Refresh the page and try again.",
        );
      }

      const user = getStoredUser();

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const rzp = new RazorpayCtor({
          key: order.keyId,
          /** Omit `amount`: Razorpay loads rupees from the order created on the server (avoids client/server drift). */
          order_id: order.orderId,
          currency: order.currency,
          name: "Larawans",
          image:
            typeof window !== "undefined"
              ? new URL(faviconIcon.src, window.location.origin).href
              : faviconIcon.src,
          description: order.planName
            ? `${order.planName} plan`
            : "Plan checkout",
          handler: (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            void (async () => {
              try {
                const subscription =
                  await verifyStoreSubscriptionRazorpayPayment(storeId, {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  });
                setActiveSubscription(subscription);
                setSubscriptionNotice(null);
                setCheckoutPlan(null);
                dispatchStoreProfileRefresh();
                showPaidSubscriptionSuccess(
                  subscription,
                  plan,
                  addons,
                  "razorpay",
                  {
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                  },
                );
              } catch (verifyErr) {
                setActivationError(
                  verifyErr instanceof Error
                    ? verifyErr.message
                    : "Payment received but activation failed. Contact support with your Razorpay payment ID.",
                );
              } finally {
                setActivatingPlanId(null);
                finish();
              }
            })();
          },
          modal: {
            ondismiss: () => {
              setActivatingPlanId(null);
              finish();
            },
          },
          prefill: {
            email: user?.email ?? undefined,
            name: user?.name ?? undefined,
          },
          theme: { color: "#d97706" },
        });

        rzp.on("payment.failed", (res) => {
          const msg = res?.error?.description ?? "Payment failed.";
          setActivationError(msg);
          setActivatingPlanId(null);
          finish();
        });

        rzp.open();
      });
    } catch (err) {
      setActivationError(
        err instanceof Error
          ? err.message
          : "Could not start checkout. If Razorpay keys are missing, add them to the Laravel backend `.env` file.",
      );
      setActivatingPlanId(null);
    } finally {
      subscriptionCheckoutLockRef.current = false;
    }
  };

  /** Same end state as successful Razorpay verify; for local/testing when mock is enabled on the API. */
  const proceedMockPaidPlanCheckout = async (
    planOverride?: SubscriptionPlan,
  ) => {
    const plan = planOverride ?? checkoutPlan;
    if (!plan || !storeId) return;
    if (storeProfile?.lifetimeAccess) {
      return;
    }
    if (subscriptionCheckoutLockRef.current) return;
    subscriptionCheckoutLockRef.current = true;
    const addons = checkoutAddonPayload(plan.id);
    setActivatingPlanId(plan.id);
    setActivationError(null);
    setSuccessMessage(null);
    try {
      await saveStoreSubscriptionAddons(storeId, addons);
      const subscription = await completeStoreSubscriptionMockPayment(storeId, {
        planId: plan.id,
        addons,
      });
      setActiveSubscription(subscription);
      setSubscriptionNotice(null);
      setCheckoutPlan(null);
      showPaidSubscriptionSuccess(subscription, plan, addons, "mock");
    } catch (err) {
      setActivationError(
        isApiError(err)
          ? err.message
          : err instanceof Error
            ? err.message
            : "Mock activation failed. On the API: ensure mock is allowed (default on; set SUBSCRIPTION_MOCK_PAYMENT=false only to disable), then `php artisan config:clear` if needed.",
      );
    } finally {
      setActivatingPlanId(null);
      subscriptionCheckoutLockRef.current = false;
    }
  };

  /** Paid subscription period is running (used for contextual copy; checkout on plan cards stays available). */
  const planChangeLockedByPaidPeriod =
    activeSubscription != null &&
    activeSubscription.status === "active" &&
    Number(activeSubscription.plan.price) > 0;

  const hasLifetimeAccess = Boolean(storeProfile?.lifetimeAccess);

  const showFreeTrialTopSection =
    !hasLifetimeAccess &&
    !activeSubscription &&
    Boolean(storeProfile && isFreeTrialPeriodOpen(storeProfile));
  const showNoSubscriptionBanner =
    !hasLifetimeAccess &&
    !activeSubscription &&
    !isFreeTrialPeriodOpen(storeProfile ?? null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
          Subscription
        </h1>
      </div>

      {qrUploadToast && (
        <div className="fixed bottom-5 right-5 z-[140] rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg">
          {qrUploadToast}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium">
          {successMessage}
        </div>
      )}

      {subscriptionNotice && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm md:text-base">
          {subscriptionNotice}
        </div>
      )}

      {activationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm md:text-base">
          {activationError}
        </div>
      )}

      {planChangeLockedByPaidPeriod && !hasLifetimeAccess && (
        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 text-sm text-indigo-950 md:text-base">
          <p className="font-semibold">Active paid subscription</p>
          <p className="mt-1 text-indigo-900/90">
            Your current period runs until{" "}
            <span className="font-medium">
              {new Date(activeSubscription!.endsAt).toLocaleDateString()}
            </span>
            . You can still open checkout from any plan card below to renew or
            change plans (subject to payment and platform rules).
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {activeSubscription && hasLifetimeAccess && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:p-6"
          id="current-subscription"
        >
          <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3 pr-16 sm:pr-0">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 md:h-12 md:w-12">
                <Crown className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-semibold text-gray-900 sm:text-base md:text-xl">
                  Lifetime free access
                </h2>
                <p className="mt-1 text-[10px] leading-relaxed text-amber-950/90 sm:text-sm">
                  Your store has unlimited platform access granted by an
                  administrator. You stay on the{" "}
                  <span className="font-semibold capitalize">
                    {activeSubscription.plan.name}
                  </span>{" "}
                  catalog label — no checkout or renewal required.
                </p>
              </div>
            </div>
            <span className="absolute right-0 top-0 inline-flex rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white sm:static sm:self-center sm:px-3 sm:py-1 sm:text-sm">
              Lifetime
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 border-t border-amber-200/80 pt-3 sm:grid-cols-2 sm:gap-3 md:gap-4">
            <div className="flex items-start justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Plan label
              </p>
              <p className="text-right text-[11px] font-semibold capitalize text-gray-900 sm:text-left sm:text-base">
                {activeSubscription.plan.name}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Access
              </p>
              <p className="text-right text-[11px] font-semibold text-amber-900 sm:text-left sm:text-base">
                No expiry · full access
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Period note
              </p>
              <p className="text-right text-[11px] font-medium text-gray-600 sm:text-left sm:text-sm">
                Subscription dates below are informational only for your current
                catalog row.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubscription && !hasLifetimeAccess && (
        <div
          className="bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-xl p-4 md:p-6 mb-6"
          id="current-subscription"
        >
          <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3 pr-16 sm:pr-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-semibold capitalize text-gray-900 sm:text-base md:text-xl">
                  Current Plan: {activeSubscription.plan.name}
                </h2>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-600 sm:mt-1 sm:gap-2 sm:text-sm md:text-base">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Active until{" "}
                    {new Date(activeSubscription.endsAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <span
              className={`absolute right-0 top-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold sm:static sm:self-center sm:px-3 sm:py-1 sm:text-sm ${
                activeSubscription.status === "active"
                  ? "bg-green-100 text-green-800"
                  : activeSubscription.status === "expired"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {activeSubscription.status}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 border-t border-purple-200/80 pt-3 sm:grid-cols-2 sm:gap-3 md:gap-4">
            <div className="flex items-start justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Plan name
              </p>
              <div className="text-right sm:text-left">
                <p className="text-[11px] font-semibold capitalize text-gray-900 sm:text-base">
                  {activeSubscription.plan.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Billing cycle
              </p>
              <p className="text-right text-[11px] font-semibold capitalize text-gray-900 sm:text-left sm:text-base">
                {formatPlanDuration(
                  activeSubscription.plan.durationDays,
                  activeSubscription.plan.billingCycle,
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Started on
              </p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                {new Date(activeSubscription.startsAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Expires on
              </p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                {new Date(activeSubscription.endsAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Remaining days
              </p>
              <p
                className={`text-right text-[11px] font-semibold sm:text-left sm:text-base ${remainingDaysClass(activeSubscription.endsAt)}`}
              >
                {remainingDaysText(activeSubscription.endsAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!activeSubscription && hasLifetimeAccess && (
        <div
          className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 md:p-6"
          id="current-subscription"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 md:h-12 md:w-12">
              <Crown className="h-5 w-5 text-white md:h-6 md:w-6" />
            </div>
            <div>
              <h2 className="text-[11px] font-semibold text-gray-900 sm:text-base md:text-xl">
                Lifetime free access
              </h2>
              <p className="mt-1 text-[10px] text-amber-950/90 sm:text-sm">
                Unlimited platform access granted by an administrator — no plan
                checkout required.
              </p>
            </div>
          </div>
        </div>
      )}

      {showFreeTrialTopSection && storeProfile?.trialEndsAt && (
        <div
          className="bg-gradient-to-r from-purple-50 to-primary-50 border border-purple-200 rounded-xl p-4 md:p-6 mb-6"
          id="current-subscription"
        >
          <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-start gap-3 pr-16 sm:pr-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-violet-500 to-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-semibold text-gray-900 sm:text-base md:text-xl">
                  Current plan: Free trial
                </h2>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-600 sm:mt-1 sm:gap-2 sm:text-sm md:text-base">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Trial access until{" "}
                    {new Date(storeProfile.trialEndsAt).toLocaleDateString(
                      "en-IN",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>
            </div>
            <span className="absolute right-0 top-0 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:static sm:self-center sm:px-3 sm:py-1 sm:text-sm">
              trial
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 border-t border-purple-200/80 pt-3 sm:grid-cols-2 sm:gap-3 md:gap-4">
            <div className="flex items-start justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Plan
              </p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                Free trial
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Store opened
              </p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                {new Date(storeProfile.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Trial ends
              </p>
              <p className="text-right text-[11px] font-semibold text-gray-900 sm:text-left sm:text-base">
                {new Date(storeProfile.trialEndsAt).toLocaleDateString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:block">
              <p className="mb-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                Time left
              </p>
              <p
                className={`text-right text-[11px] font-semibold sm:text-left sm:text-base ${remainingDaysClass(storeProfile.trialEndsAt)}`}
              >
                {remainingDaysText(storeProfile.trialEndsAt)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-600 sm:text-sm">
            After the trial, choose a paid plan below to keep your store fully
            featured — or your catalog may be limited as per platform rules.
          </p>
        </div>
      )}

      {showNoSubscriptionBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6">
          <p className="text-blue-800 font-medium">
            You don&apos;t have an active subscription. Choose a plan below to
            get started!
          </p>
        </div>
      )}

      {plans.length > 0 && (
        <section
          className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6"
          aria-labelledby="subscription-plan-catalog-heading"
        >
          <div className="mb-5 hidden min-w-0 border-b border-gray-100 pb-4 md:block">
            <h2
              id="subscription-plan-catalog-heading"
              className="text-lg font-semibold text-gray-900 md:text-xl"
            >
              All subscription plans
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Full catalog from your administrator (including inactive plans for
              reference). Checkout is only offered on plans marked available.
            </p>
            {hasLifetimeAccess ? (
              <p className="mt-3 text-sm font-medium leading-snug text-amber-900">
                You have lifetime platform access. Plan checkout is not required;
                the cards below are for reference only.
              </p>
            ) : planChangeLockedByPaidPeriod && activeSubscription ? (
              <p className="mt-3 text-sm font-medium leading-snug text-indigo-950">
                You have an active paid subscription (ends{" "}
                {new Date(activeSubscription.endsAt).toLocaleDateString()}). Use{" "}
                <span className="font-semibold">Choose plan</span> on any card
                below to open checkout.
              </p>
            ) : (
              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-gray-600">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                {activeSubscription
                  ? "Your active plan is summarized above. Open a card for details, or use Choose plan on an available plan to review add-ons and checkout."
                  : showFreeTrialTopSection
                    ? "Your free trial is summarized above. When you’re ready, use Choose plan on a paid plan to check out."
                    : "Open a card for details, or use Choose plan to expand checkout options on that plan."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {orderedPlans.map((plan) => {
              const planEnabled = plan.isActive !== false;
              const planNameSlug =
                `${plan.name ?? ""} ${plan.slug ?? ""}`.toLowerCase();
              const isFreePlan = Number(plan.price) <= 0;
              const isBasicFreePlan =
                planEnabled &&
                (isFreePlan ||
                  planNameSlug.includes("free") ||
                  planNameSlug.includes("basic"));
              // Frontend-only: treat the free/basic plan as already active unless there's an active subscription record.
              // (Admin can still manage plans; this only affects the dashboard UI state.)
              const showFreePlanAsActive =
                isBasicFreePlan && !(activeSubscription?.status === "active");
              const isCurrentPlan = activeSubscription?.plan.id === plan.id;
              const isActiveCurrentPlan =
                isCurrentPlan && activeSubscription?.status === "active";
              const isActivating = activatingPlanId === plan.id;
              const isModalPlan = selectedPlan?.id === plan.id;
              const canOpenDetailsModal = false;
              const showInlineAddons = plan.isActive;
              const cardAddons = addonsByPlanId[plan.id] ?? hydratedStoreAddons;
              const cardAddonSum =
                addonPrices != null
                  ? cardAddons.qrCode
                    ? addonPrices.qr_code_inr
                    : 0
                  : 0;
              const displayPrice = formatInr(Number(plan.price) + cardAddonSum);

              return (
                <div
                  key={plan.id}
                  role={canOpenDetailsModal ? "button" : undefined}
                  tabIndex={canOpenDetailsModal ? 0 : undefined}
                  aria-haspopup={canOpenDetailsModal ? "dialog" : undefined}
                  aria-expanded={canOpenDetailsModal ? isModalPlan : undefined}
                  aria-label={
                    canOpenDetailsModal
                      ? `${plan.name} plan, ₹${plan.price}. Open details`
                      : `${plan.name} — your current plan (details above)`
                  }
                  onClick={() => {
                    if (canOpenDetailsModal) openPlanModal(plan);
                  }}
                  onKeyDown={(e) => {
                    if (canOpenDetailsModal) handlePlanCardKeyDown(e, plan);
                  }}
                  className={`overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition md:rounded-xl md:shadow-md ${
                    canOpenDetailsModal
                      ? "cursor-pointer hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      : "cursor-default ring-2 ring-purple-200/80"
                  } ${plan.isPopular && !isCurrentPlan ? "ring-2 ring-primary" : ""} ${
                    isModalPlan ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                >
                  {plan.isPopular && (
                    <div className="bg-gradient-to-r from-primary to-indigo-600 py-2 text-center text-[10px] font-semibold tracking-wide text-white md:text-sm">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="p-3 md:p-6">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {!plan.isActive ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200/80">
                          Inactive
                        </span>
                      ) : null}
                      {showFreePlanAsActive ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                          Already active
                        </span>
                      ) : isCurrentPlan ? (
                        <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200/80">
                          Your plan
                        </span>
                      ) : storeProfile?.lifetimeAccess ? (
                        <span className="inline-flex rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-2 py-0.5 text-xs font-semibold text-white ring-1 ring-amber-300/80 shadow-sm">
                          <span className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Lifetime Access
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mb-1 text-base font-bold capitalize tracking-tight text-slate-900 md:text-xl">
                      {plan.name}
                    </h3>
                    <div className="mb-3 flex items-end gap-1.5 md:mb-4">
                      <span className="text-3xl font-bold leading-none text-slate-900 md:text-4xl">
                        ₹{displayPrice}
                      </span>
                      <span className="pb-0.5 text-[11px] text-slate-600 md:text-base">
                        /
                        {formatPlanDuration(
                          plan.durationDays,
                          plan.billingCycle,
                        )}
                      </span>
                    </div>
                    {showInlineAddons ? (
                      <p className="mb-3 text-[10px] font-medium text-slate-500 md:text-xs">
                        Base: ₹{formatInr(Number(plan.price))} + Add-ons: ₹
                        {formatInr(cardAddonSum)}
                      </p>
                    ) : null}

                    <ul className="mb-4 space-y-1.5 p-0 md:mb-6 md:space-y-3">
                      {(
                        plan.id === activeSubscription?.plan?.id &&
                        Number(activeSubscription?.plan?.price ?? 0) > 0
                          ? featuresWithoutTrialHints(
                              Array.isArray(plan.features) ? plan.features : [],
                            )
                          : Array.isArray(plan.features)
                            ? plan.features
                            : []
                      ).map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-1.5 px-0 py-0.5 md:gap-2 md:py-0"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500 md:h-5 md:w-5" />
                          <span className="text-[10px] font-semibold leading-snug text-slate-700 md:text-sm md:font-normal">
                            {feature}
                          </span>
                        </li>
                      ))}
                      {storeProfile?.lifetimeAccess && isFreePlan && (
                        <li className="flex items-start gap-1.5 px-0 py-0.5 md:gap-2 md:py-0">
                          <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 md:h-5 md:w-5" />
                          <span className="text-[10px] font-semibold leading-snug text-amber-700 md:text-sm md:font-normal">
                            Lifetime free access granted by admin
                          </span>
                        </li>
                      )}
                    </ul>

                    {showInlineAddons ? (
                      <div
                        className="mb-4 p-0"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {Number(plan.price) > 0 ? (
                          <div className="mb-3 rounded-lg border border-emerald-200/90 bg-emerald-50/90 px-2.5 py-2 md:px-3 md:py-2.5">
                            {addonPricesLoading || !addonPrices ? (
                              <p className="text-[10px] font-medium text-emerald-900/80 md:text-xs">
                                <Loader2
                                  className="mr-1 inline h-3 w-3 animate-spin align-middle"
                                  aria-hidden
                                />
                                Loading billing discount from settings…
                              </p>
                            ) : (
                              <p className="text-[11px] font-bold text-emerald-950 md:text-xs">
                                Billing discount on checkout:{" "}
                                <span className="tabular-nums">
                                  {subscriptionBillingDiscountPercentForPlan(
                                    plan,
                                    addonPrices,
                                    plans,
                                  )}
                                  %
                                </span>
                              </p>
                            )}
                          </div>
                        ) : null}
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Optional add-ons
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            {addonPricesLoading && (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading…
                              </span>
                            )}
                            {!addonHydrated && !addonPricesLoading && (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Syncing…
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <AddonToggleRow
                            icon={CreditCard}
                            title="Payment gateway integration"
                            hint="We help connect a payment gateway to your store."
                            priceInr={
                              addonPrices?.payment_gateway_integration_inr ?? 0
                            }
                            checked={Boolean(cardAddons.paymentGateway)}
                            onToggle={() =>
                              setAddonsByPlanId((prev) => ({
                                ...prev,
                                [plan.id]: {
                                  ...cardAddons,
                                  paymentGateway: !cardAddons.paymentGateway,
                                },
                              }))
                            }
                            disabled={addonPricesLoading || !addonHydrated}
                          />
                          <AddonToggleRow
                            icon={QrCode}
                            title="QR code"
                            hint="QR-based payment display for your storefront."
                            priceInr={addonPrices?.qr_code_inr ?? 0}
                            checked={Boolean(cardAddons.qrCode)}
                            onToggle={() =>
                              setAddonsByPlanId((prev) => {
                                const next = !cardAddons.qrCode;
                                if (next && cardAddons.paymentGateway) {
                                  setQrUploadPlanId(plan.id);
                                  setQrUploadOpen(true);
                                }
                                return {
                                  ...prev,
                                  [plan.id]: { ...cardAddons, qrCode: next },
                                };
                              })
                            }
                            disabled={addonPricesLoading || !addonHydrated}
                          />
                          <AddonToggleRow
                            icon={Building2}
                            title="Payment gateway — company help"
                            hint="Our team handles gateway setup on your behalf."
                            priceInr={
                              addonPrices?.payment_gateway_help_inr ?? 0
                            }
                            checked={Boolean(cardAddons.paymentGatewayHelp)}
                            onToggle={() =>
                              setAddonsByPlanId((prev) => ({
                                ...prev,
                                [plan.id]: {
                                  ...cardAddons,
                                  paymentGatewayHelp:
                                    !cardAddons.paymentGatewayHelp,
                                },
                              }))
                            }
                            disabled={addonPricesLoading || !addonHydrated}
                          />
                        </div>
                      </div>
                    ) : null}

                    {(() => {
                      const addons = checkoutAddonPayload(plan.id);
                      const hasBothCoreAddons =
                        Boolean(addons.paymentGateway) && Boolean(addons.qrCode);
                      if (Number(plan.price) > 0 && isActiveCurrentPlan) {
                        if (!hasBothCoreAddons) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCheckoutPlan(plan);
                                setUpgradeConfirmOpen(true);
                              }}
                              disabled={isActivating || !planEnabled || hasLifetimeAccess}
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[15px] font-semibold text-white transition hover:bg-primary-700 md:rounded-lg md:py-3 md:text-base"
                            >
                              Upgrade Plan • ₹{displayPrice}
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            disabled
                            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-violet-50 py-2.5 text-[15px] font-semibold text-violet-900 md:rounded-lg md:py-3 md:text-base"
                          >
                            Active plan
                          </button>
                        );
                      }

                      // FREE PLAN or other cases
                      return (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setCheckoutPlan(plan);
                            setSubscriptionNotice(null);
                            setActivationError(null);
                            setSuccessMessage(null);
                            if (Number(plan.price) > 0) {
                              setCheckoutConfirmOpen(true);
                            } else {
                              await handleActivatePlan(
                                plan,
                                checkoutAddonPayload(plan.id),
                              );
                            }
                          }}
                          disabled={
                            isActivating ||
                            !planEnabled ||
                            showFreePlanAsActive ||
                            isActiveCurrentPlan ||
                            hasLifetimeAccess
                          }
                          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[15px] font-semibold transition md:rounded-lg md:py-3 md:text-base ${
                              !planEnabled
                                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                : hasLifetimeAccess
                                  ? "cursor-not-allowed bg-amber-50 text-amber-900"
                                  : showFreePlanAsActive
                                    ? "cursor-not-allowed bg-emerald-50 text-emerald-900"
                                    : isActiveCurrentPlan
                                      ? "cursor-not-allowed bg-violet-50 text-violet-900"
                                      : "bg-primary text-white hover:bg-primary-700"
                            }`}
                        >
                          {isActivating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Activating...
                            </>
                          ) : !planEnabled ? (
                            "Unavailable"
                          ) : hasLifetimeAccess ? (
                            "Lifetime access — no plan needed"
                          ) : showFreePlanAsActive ? (
                            "Already Active"
                          ) : isActiveCurrentPlan ? (
                            "Active plan"
                          ) : isCurrentPlan ? (
                            `Renew • ₹${displayPrice}`
                          ) : (
                            `Choose Plan • ₹${displayPrice}`
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {mounted &&
        selectedPlan &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={closePlanModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-modal-title"
              className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-lg flex-col rounded-t-3xl border border-gray-200/80 bg-white shadow-2xl shadow-gray-900/20 sm:rounded-3xl"
            >
              <div className="relative shrink-0 overflow-hidden rounded-t-3xl bg-gradient-to-br from-violet-600 via-primary to-indigo-700 px-6 pb-10 pt-8 text-white sm:rounded-t-3xl">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                        Plan details
                      </p>
                      <h2
                        id="plan-modal-title"
                        className="mt-1 text-2xl font-bold capitalize leading-tight tracking-tight"
                      >
                        {selectedPlan.name}
                      </h2>
                      <p className="mt-1 truncate text-sm text-white/75">
                        Ref: {selectedPlan.slug}
                      </p>
                    </div>
                  </div>
                  <button
                    ref={closeModalButtonRef}
                    type="button"
                    onClick={closePlanModal}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative mt-6 flex flex-wrap items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">
                    ₹{selectedPlan.price}
                  </span>
                  <span className="pb-1 text-base text-white/85">
                    /{" "}
                    {formatPlanDuration(
                      selectedPlan.durationDays,
                      selectedPlan.billingCycle,
                    )}
                  </span>
                </div>
              </div>

              <div className="-mt-4 flex-1 overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-5 pb-6 pt-5 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.isPopular && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      Most popular
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selectedPlan.isActive !== false
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {selectedPlan.isActive !== false
                      ? "Available"
                      : "Unavailable"}
                  </span>
                  {activeSubscription?.plan.id === selectedPlan.id && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                      Your current plan
                    </span>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Limits
                  </p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    Max products:{" "}
                    {selectedPlan.maxProducts >= 999999
                      ? "Unlimited"
                      : selectedPlan.maxProducts}
                  </p>
                </div>

                {selectedPlan.description && (
                  <div className="mt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Description
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                      {selectedPlan.description}
                    </p>
                  </div>
                )}

                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    All features
                  </h3>
                  <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {(selectedPlan.id === activeSubscription?.plan.id &&
                    Number(activeSubscription?.plan.price ?? 0) > 0
                      ? featuresWithoutTrialHints(selectedPlan.features)
                      : selectedPlan.features
                    ).map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closePlanModal}
                    className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 sm:w-auto sm:px-5"
                  >
                    Close
                  </button>
                  {selectedPlan.isActive !== false && storeId && (
                    <button
                      type="button"
                      onClick={async () => {
                        setCheckoutPlan(selectedPlan);
                        setSubscriptionNotice(null);
                        setActivationError(null);
                        setSuccessMessage(null);
                        if (Number(selectedPlan.price) > 0) {
                          setCheckoutConfirmOpen(true);
                        } else {
                          await handleActivatePlan(
                            selectedPlan,
                            checkoutAddonPayload(),
                          );
                        }
                      }}
                      disabled={
                        hasLifetimeAccess ||
                        (activeSubscription?.plan.id === selectedPlan.id &&
                          activeSubscription?.status === "active")
                      }
                      className={`w-full rounded-xl py-3 text-sm font-semibold shadow-lg transition sm:w-auto sm:px-6 ${
                        hasLifetimeAccess
                          ? "cursor-not-allowed bg-amber-50 text-amber-900 shadow-amber-200/40"
                          : activeSubscription?.plan.id === selectedPlan.id &&
                              activeSubscription?.status === "active"
                            ? "cursor-not-allowed bg-violet-50 text-violet-900 shadow-violet-200/40"
                            : "bg-primary text-white shadow-primary/25 hover:bg-primary-700"
                      }`}
                    >
                      {hasLifetimeAccess
                        ? "Lifetime access — no plan needed"
                        : activeSubscription?.plan.id === selectedPlan.id &&
                            activeSubscription?.status === "active"
                          ? "Active plan"
                          : activeSubscription?.plan.id === selectedPlan.id
                            ? "Renew this plan"
                            : "Choose this plan"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        checkoutConfirmOpen &&
        checkoutPlan &&
        createPortal(
          <div
            className="fixed inset-0 z-[103] flex items-center justify-center p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={closeCheckoutConfirm}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkout-confirm-title"
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
                      Confirm plan
                    </p>
                    <h2
                      id="checkout-confirm-title"
                      className="mt-1 truncate text-base font-bold text-slate-900 sm:text-xl"
                    >
                      {checkoutPlan.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                      Plan type:{" "}
                      {(checkoutPlan.slug || checkoutPlan.name).toString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCheckoutConfirm}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-3 sm:px-6 sm:py-4">
                {(() => {
                  const addons = checkoutAddonPayload(checkoutPlan.id);
                  const addonSumLocal =
                    addonPrices != null
                      ? addons.qrCode
                        ? addonPrices.qr_code_inr
                        : 0
                      : 0;
                  const base = Number(checkoutPlan.price) || 0;
                  const grossSubtotal = base + addonSumLocal;
                  const discountPct = subscriptionBillingDiscountPercentForPlan(
                    checkoutPlan,
                    addonPrices,
                    plans,
                  );
                  const discountRupees =
                    grossSubtotal > 0 && discountPct > 0
                      ? Math.round(grossSubtotal * (discountPct / 100))
                      : 0;
                  const taxableSubtotal = Math.max(
                    0,
                    grossSubtotal - discountRupees,
                  );
                  const gstAmount = Math.round(
                    taxableSubtotal * (SUBSCRIPTION_CHECKOUT_GST_PERCENT / 100),
                  );
                  const grandTotal = taxableSubtotal + gstAmount;
                  return (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                          Summary
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">
                          ₹{formatInr(base)} /{" "}
                          {formatPlanDuration(
                            checkoutPlan.durationDays,
                            checkoutPlan.billingCycle,
                          )}
                        </p>
                        <div className="mt-3 space-y-2 border-t border-slate-200/90 pt-3 text-[11px] text-slate-700 sm:text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span>Subtotal (base + add-ons)</span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                              ₹{formatInr(grossSubtotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Billing discount ({discountPct}%)</span>
                            <span className="shrink-0 font-semibold tabular-nums text-emerald-700">
                              {discountRupees > 0
                                ? `-\u20B9${formatInr(discountRupees)}`
                                : `\u20B9${formatInr(0)}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Amount before GST</span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                              ₹{formatInr(taxableSubtotal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>
                              GST ({SUBSCRIPTION_CHECKOUT_GST_PERCENT}%)
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                              ₹{formatInr(gstAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-slate-200/90 pt-2 text-xs font-bold text-slate-900 sm:text-sm">
                            <span>Total payable</span>
                            <span className="shrink-0 tabular-nums">
                              ₹{formatInr(grandTotal)}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500 sm:text-[11px]">
                          Base ₹{formatInr(base)} + Add-ons ₹
                          {formatInr(addonSumLocal)}. Billing discount{" "}
                          {discountPct}% (from platform settings) is applied
                          first; then {SUBSCRIPTION_CHECKOUT_GST_PERCENT}% GST
                          on the amount before GST.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-100 bg-white p-3 sm:p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                          Add-ons selected
                        </p>
                        <ul className="mt-3 space-y-2 text-xs text-slate-700 sm:text-sm">
                          <li className="flex items-center justify-between gap-3">
                            <span className="font-medium">
                              Payment gateway integration
                            </span>
                            <span
                              className={`text-xs font-semibold ${addons.paymentGateway ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {addons.paymentGateway ? "Enabled" : "Off"}
                            </span>
                          </li>
                          <li className="flex items-center justify-between gap-3">
                            <span className="font-medium">QR code</span>
                            <span
                              className={`text-xs font-semibold ${addons.qrCode ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {addons.qrCode ? "Enabled" : "Off"}
                            </span>
                          </li>
                          <li className="flex items-center justify-between gap-3">
                            <span className="font-medium">
                              Payment gateway — company help
                            </span>
                            <span
                              className={`text-xs font-semibold ${addons.paymentGatewayHelp ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {addons.paymentGatewayHelp ? "Enabled" : "Off"}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={closeCheckoutConfirm}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-[13px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      closeCheckoutConfirm();
                      await proceedPaidPlanCheckout(checkoutPlan);
                    }}
                    disabled={
                      activatingPlanId === checkoutPlan.id ||
                      !storeId ||
                      addonPricesLoading ||
                      !addonHydrated
                    }
                    className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-2.5 text-[13px] font-semibold text-white shadow-md transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  You’ll be redirected to Razorpay to complete payment.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        upgradeConfirmOpen &&
        checkoutPlan &&
        createPortal(
          <div
            className="fixed inset-0 z-[104] flex items-center justify-center p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={() => setUpgradeConfirmOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-confirm-title"
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
                      Confirm upgrade
                    </p>
                    <h2
                      id="upgrade-confirm-title"
                      className="mt-1 truncate text-base font-bold text-slate-900 sm:text-xl"
                    >
                      {checkoutPlan.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpgradeConfirmOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6">
                <div className="space-y-3">
                  <p className="text-sm text-slate-700">
                    Are you sure you want to upgrade your plan?
                  </p>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-medium text-amber-900">
                      After upgrade, our team will contact you within 24 hours to complete the integration setup.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setUpgradeConfirmOpen(false)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:px-5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!storeId || !checkoutPlan) return;
                      setActivatingPlanId(checkoutPlan.id);
                      try {
                        const addons = checkoutAddonPayload(checkoutPlan.id);
                        await requestUpgradeInquiry(storeId, {
                          planId: checkoutPlan.id,
                          addons,
                        });

                        // Show success modal
                        setUpgradeConfirmOpen(false);
                        setUpgradeSuccessOpen(true);
                        dispatchStoreProfileRefresh();
                      } catch (error) {
                        console.error('Upgrade request failed:', error);
                        setSubscriptionNotice(
                          isApiError(error) 
                            ? error.message 
                            : "Failed to submit upgrade request. Please try again."
                        );
                        setUpgradeConfirmOpen(false);
                      } finally {
                        setActivatingPlanId(null);
                      }
                    }}
                    disabled={activatingPlanId === checkoutPlan.id}
                    className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                  >
                    {activatingPlanId === checkoutPlan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Yes, Upgrade"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        upgradeSuccessOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[105] flex items-center justify-center p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={() => setUpgradeSuccessOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-success-title"
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-gradient-to-r from-green-50 via-white to-emerald-50 px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-[11px]">
                      Upgrade Request Submitted
                    </p>
                    <h2
                      id="upgrade-success-title"
                      className="mt-1 truncate text-base font-bold text-slate-900 sm:text-xl"
                    >
                      Thank you!
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpgradeSuccessOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Please call on 7015150181
                      </p>
                      <p className="text-xs text-slate-600">
                        Our team will contact you within 24 hours to complete the integration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <button
                  type="button"
                  onClick={() => setUpgradeSuccessOpen(false)}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 sm:w-auto sm:px-6"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        qrUploadOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[106] flex items-end justify-center sm:items-center sm:p-4"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close dialog"
              onClick={closeQrUpload}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-upload-title"
              className="relative z-10 w-[85%] max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-full sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-4 py-4 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      QR code upload
                    </p>
                    <h2
                      id="qr-upload-title"
                      className="mt-1 truncate text-base font-bold text-slate-900 sm:text-xl"
                    >
                      Upload your payment QR
                    </h2>
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                      This will be shown on your storefront for customers to
                      scan and pay.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeQrUpload}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-4 py-3 sm:max-h-[70vh] sm:px-6 sm:py-4">
                {qrUploadError ? (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {qrUploadError}
                  </div>
                ) : null}

                <label className="group block cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 transition group-hover:border-primary/40 group-hover:bg-primary/5 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm ring-1 ring-slate-200">
                        <Download className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          Choose an image
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          JPG / PNG / WebP • max 4 MB
                        </p>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm">
                        Browse
                      </span>
                    </div>

                    {qrUploadPreviewUrl ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrUploadPreviewUrl}
                          alt="QR preview"
                          className="h-auto w-full max-h-44 object-contain sm:max-h-64"
                        />
                      </div>
                    ) : null}
                  </div>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setQrUploadError(null);
                      if (file.size > 4 * 1024 * 1024) {
                        setQrUploadError("QR image must be 4 MB or smaller.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result =
                          typeof reader.result === "string"
                            ? reader.result
                            : "";
                        const parts = result.split(",");
                        const b64 = parts.length > 1 ? parts[1] : "";
                        if (!b64) {
                          setQrUploadError(
                            "Could not read this image. Please try another file.",
                          );
                          return;
                        }
                        setQrUploadPreviewUrl(result);
                        setQrUploadBase64(b64);
                        setQrUploadMime(file.type || "image/png");
                      };
                      reader.onerror = () =>
                        setQrUploadError(
                          "Could not read this image. Please try again.",
                        );
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              <div className="border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeQrUpload}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:px-5"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    disabled={!storeId || !qrUploadBase64 || qrUploading}
                    onClick={async () => {
                      if (!storeId || !qrUploadBase64) {
                        setQrUploadError("Please choose a QR image first.");
                        return;
                      }
                      setQrUploading(true);
                      setQrUploadError(null);
                      try {
                        // Backend requires `subscription_addons` selection before allowing QR save.
                        // In this flow, user toggles the add-on before checkout, so persist it first.
                        await saveStoreSubscriptionAddons(storeId, {
                          ...checkoutAddonPayload(qrUploadPlanId),
                          qrCode: true,
                        });
                        await updateStorePaymentIntegration(storeId, {
                          payment_qr_base64: qrUploadBase64,
                          payment_qr_mime: qrUploadMime ?? undefined,
                        });
                        setQrUploadToast("QR code saved.");
                        closeQrUpload();
                      } catch (e) {
                        setQrUploadError(
                          isApiError(e)
                            ? e.message
                            : "Could not upload QR right now. Please try again.",
                        );
                      } finally {
                        setQrUploading(false);
                      }
                    }}
                    className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                  >
                    {qrUploading ? "Uploading…" : "Save QR"}
                  </button>
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  Tip: You can change this later in Payment Integration settings
                  too.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        paymentSuccessInvoice &&
        (() => {
          const inv = paymentSuccessInvoice;
          const storeSnap = invoiceStoreSnapshot;
          const t = inv.totals;
          return createPortal(
            <div
              className="fixed inset-0 z-[105] flex items-end justify-center sm:items-center sm:p-4"
              role="presentation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                aria-label="Close dialog"
                onClick={() => setPaymentSuccessInvoice(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-success-title"
                className="relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="shrink-0 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                        <Check className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                          Payment successful
                        </p>
                        <h2
                          id="payment-success-title"
                          className="text-lg font-bold leading-tight text-slate-900 sm:text-xl"
                        >
                          {inv.plan.name} plan is active
                        </h2>
                        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                          Valid until{" "}
                          <span className="font-medium">
                            {new Date(
                              inv.subscription.endsAt,
                            ).toLocaleDateString("en-IN")}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      ref={paymentSuccessCloseRef}
                      type="button"
                      onClick={() => setPaymentSuccessInvoice(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
                  {storeSnap ? (
                    <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Store
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {storeSnap.name}
                      </p>
                      {storeSnap.username ? (
                        <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                          Store URL: /{storeSnap.username}
                        </p>
                      ) : null}
                      {storeSnap.location ? (
                        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                          {storeSnap.location}
                        </p>
                      ) : null}
                      {[storeSnap.district, storeSnap.state].filter(Boolean)
                        .length > 0 ? (
                        <p className="mt-0.5 text-xs text-slate-600">
                          {[storeSnap.district, storeSnap.state]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {storeSnap.phone ? (
                          <span>Phone: {storeSnap.phone}</span>
                        ) : null}
                        {storeSnap.whatsapp ? (
                          <span>WhatsApp: {storeSnap.whatsapp}</span>
                        ) : null}
                        {storeSnap.email ? (
                          <span className="min-w-0 max-w-full break-all">
                            Email: {storeSnap.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Billing summary
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">
                      ₹{formatInr(Number(inv.plan.price) || 0)} /{" "}
                      {formatPlanDuration(
                        inv.plan.durationDays,
                        inv.plan.billingCycle,
                      )}
                    </p>
                    <div className="mt-3 space-y-2 border-t border-slate-200/90 pt-3 text-[11px] text-slate-700 sm:text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span>Subtotal (base + add-ons)</span>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                          ₹{formatInr(t.grossSubtotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Billing discount ({t.discountPct}%)</span>
                        <span className="shrink-0 font-semibold tabular-nums text-emerald-700">
                          {t.discountRupees > 0
                            ? `−₹${formatInr(t.discountRupees)}`
                            : `₹${formatInr(0)}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Amount before GST</span>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                          ₹{formatInr(t.taxableSubtotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>GST ({SUBSCRIPTION_CHECKOUT_GST_PERCENT}%)</span>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                          ₹{formatInr(t.gstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-200/90 pt-2 text-xs font-bold text-slate-900 sm:text-sm">
                        <span>Total paid</span>
                        <span className="shrink-0 tabular-nums">
                          ₹{formatInr(t.grandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3 sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Add-ons
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-700 sm:text-sm">
                      <li className="flex justify-between gap-3">
                        <span className="font-medium">
                          Payment gateway integration
                        </span>
                        <span
                          className={
                            inv.addons.paymentGateway
                              ? "font-semibold text-emerald-700"
                              : "text-slate-500"
                          }
                        >
                          {inv.addons.paymentGateway ? "Yes" : "No"}
                        </span>
                      </li>
                      <li className="flex justify-between gap-3">
                        <span className="font-medium">QR code</span>
                        <span
                          className={
                            inv.addons.qrCode
                              ? "font-semibold text-emerald-700"
                              : "text-slate-500"
                          }
                        >
                          {inv.addons.qrCode ? "Yes" : "No"}
                        </span>
                      </li>
                      <li className="flex justify-between gap-3">
                        <span className="font-medium">
                          Payment gateway — company help
                        </span>
                        <span
                          className={
                            inv.addons.paymentGatewayHelp
                              ? "font-semibold text-emerald-700"
                              : "text-slate-500"
                          }
                        >
                          {inv.addons.paymentGatewayHelp ? "Yes" : "No"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Payment
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {inv.method === "mock"
                        ? "Mock payment (test)"
                        : "Razorpay"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Paid at {new Date(inv.paidAtIso).toLocaleString("en-IN")}
                    </p>
                    {inv.method === "razorpay" &&
                    (inv.razorpayPaymentId || inv.razorpayOrderId) ? (
                      <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                        {inv.razorpayPaymentId ? (
                          <p className="break-all">
                            <span className="font-medium text-slate-700">
                              Payment ID:{" "}
                            </span>
                            {inv.razorpayPaymentId}
                          </p>
                        ) : null}
                        {inv.razorpayOrderId ? (
                          <p className="break-all">
                            <span className="font-medium text-slate-700">
                              Order ID:{" "}
                            </span>
                            {inv.razorpayOrderId}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const html = buildSubscriptionInvoiceHtml({
                          store: invoiceStoreSnapshot,
                          subscription: inv.subscription,
                          plan: inv.plan,
                          addons: inv.addons,
                          totals: inv.totals,
                          pricing: addonPrices,
                          method: inv.method,
                          razorpayPaymentId: inv.razorpayPaymentId,
                          razorpayOrderId: inv.razorpayOrderId,
                          paidAtIso: inv.paidAtIso,
                        });
                        const slug = (
                          invoiceStoreSnapshot?.username ?? "store"
                        ).replace(/[^a-zA-Z0-9_-]/g, "_");
                        triggerHtmlInvoiceDownload(
                          `subscription-invoice-${slug}-${inv.subscription.id.slice(0, 8)}.html`,
                          html,
                        );
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 sm:w-auto sm:px-6"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Download invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentSuccessInvoice(null)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:px-6"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          );
        })()}
    </div>
  );
}
