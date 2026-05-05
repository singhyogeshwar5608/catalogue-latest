"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CreditCard,
  Loader2,
  MessageCircle,
  Phone,
  QrCode,
  Trash2,
} from "lucide-react";
import {
  getStoredUser,
  getStoreBySlugFromApi,
  getStorePaymentIntegration,
  updateStorePaymentIntegration,
} from "@/src/lib/api";
import {
  dispatchStoreProfileRefresh,
  storeCanAccessPaymentIntegrationHub,
} from "@/src/lib/storeSubscriptionAddons";
import { checkoutQrImageSrc } from "@/src/lib/checkoutAssetUrl";
import type { Store, StorePaymentIntegrationSettings } from "@/types";

const HELP_COPY =
  "Need help connecting Razorpay or finishing UPI setup? Message us on WhatsApp and our team will assist you.";

const QR_MAX_BYTES = 4 * 1024 * 1024;

function readQrFileAsPayload(file: File): Promise<{ payment_qr_base64: string; payment_qr_mime: string }> {
  if (file.size > QR_MAX_BYTES) {
    return Promise.reject(new Error("QR image must be 4 MB or smaller."));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("Could not read image file."));
        return;
      }
      const comma = dataUrl.indexOf(",");
      if (comma < 0) {
        reject(new Error("Could not read image file."));
        return;
      }
      resolve({
        payment_qr_base64: dataUrl.slice(comma + 1),
        payment_qr_mime: file.type || "image/png",
      });
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export default function PaymentIntegrationPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<StorePaymentIntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<"qr" | "pg" | null>(null);

  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async (storeId: string) => {
    setSettingsLoading(true);
    setSaveError(null);
    try {
      const s = await getStorePaymentIntegration(storeId);
      setSettings(s);
      setRazorpayKeyId(s.razorpayKeyId ?? "");
      setRazorpaySecret("");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not load payment settings.");
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const user = getStoredUser();
        if (!user?.storeSlug) {
          setError("No store linked to this account.");
          return;
        }
        const s = await getStoreBySlugFromApi(user.storeSlug);
        if (!cancelled) {
          setStore(s);
          setError(null);
          await loadSettings(s.id);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load your store.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSettings]);

  const hasAccess = store != null && storeCanAccessPaymentIntegrationHub(store);

  useEffect(() => {
    if (!loading && store != null && !storeCanAccessPaymentIntegrationHub(store)) {
      router.replace("/dashboard/subscription");
    }
  }, [loading, store, router]);

  const addons = settings?.subscriptionAddons ?? store?.subscriptionAddons;
  const showPg = Boolean(addons?.paymentGateway);
  const showQr = Boolean(addons?.qrCode);
  const showHelp = Boolean(addons?.paymentGatewayHelp);

  const handleSaveQr = async () => {
    if (!store) return;
    if (!qrFile) {
      setSaveError("Choose an image file for your payment QR.");
      return;
    }
    setSavingSection("qr");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const payload = await readQrFileAsPayload(qrFile);
      const next = await updateStorePaymentIntegration(store.id, payload);
      if (!next.paymentQrUrl) {
        throw new Error(
          "The server did not store the QR image (no public URL). Check that `public/` is writable on the API host, then try again."
        );
      }
      setSettings(next);
      setQrFile(null);
      if (qrFileInputRef.current) {
        qrFileInputRef.current.value = "";
      }
      setSaveMessage("QR code saved.");
      dispatchStoreProfileRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleRemoveQr = async () => {
    if (!store) return;
    setSavingSection("qr");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const next = await updateStorePaymentIntegration(store.id, { remove_payment_qr: true });
      setSettings(next);
      setQrFile(null);
      if (qrFileInputRef.current) {
        qrFileInputRef.current.value = "";
      }
      setSaveMessage("QR code removed.");
      dispatchStoreProfileRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not remove QR.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveRazorpay = async () => {
    if (!store) return;
    if (!razorpayKeyId.trim()) {
      setSaveError("Enter your Razorpay Key ID.");
      return;
    }
    if (!settings?.hasRazorpaySecret && !razorpaySecret.trim()) {
      setSaveError("Enter your Razorpay Key Secret (it is stored encrypted and never shown again).");
      return;
    }
    setSavingSection("pg");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const next = await updateStorePaymentIntegration(store.id, {
        razorpay_key_id: razorpayKeyId.trim(),
        ...(razorpaySecret.trim() ? { razorpay_key_secret: razorpaySecret.trim() } : {}),
      });
      setSettings(next);
      setRazorpaySecret("");
      setSaveMessage("Razorpay keys saved.");
      dispatchStoreProfileRefresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleClearSecret = async () => {
    if (!store) return;
    setSavingSection("pg");
    setSaveMessage(null);
    setSaveError(null);
    try {
      const next = await updateStorePaymentIntegration(store.id, { clear_razorpay_secret: true });
      setSettings(next);
      setRazorpaySecret("");
      setSaveMessage("API secret cleared.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not clear secret.");
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="mt-3 text-sm text-gray-600">Loading payment settings…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium text-red-900">Something went wrong</p>
        <p className="mt-1">{error ?? "Store not found."}</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="text-sm text-gray-600">Opening subscription…</p>
      </div>
    );
  }

  if (!showPg && !showQr && !showHelp) {
    return (
      <div className="max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:p-5">
        <p className="font-medium">No payment add-ons enabled</p>
        <p className="mt-2 text-amber-900/90">
          Turn on payment gateway, QR code, or assisted setup on the subscription page, then return here.
        </p>
      </div>
    );
  }

  const enabledPill = (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
      <Check className="h-3 w-3" strokeWidth={2.5} />
      Enabled
    </span>
  );

  const inputClass =
    "mt-1 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 sm:text-sm";

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-5 pb-8 sm:space-y-6 sm:pb-10">
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payments</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900 sm:text-2xl">Payment settings</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Only the options you enabled at subscription time appear here. Upload your UPI QR and/or enter Razorpay
          credentials; assisted setup opens WhatsApp to our team.
        </p>
        <p className="mt-3 text-sm text-gray-900">
          <span className="text-gray-500">Store</span> · {store.name}
        </p>
      </div>

      {(saveMessage || saveError || settingsLoading) && (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          {saveMessage && (
            <div className="flex flex-1 items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 sm:min-w-0">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2.5} />
              <p className="min-w-0 break-words">{saveMessage}</p>
            </div>
          )}
          {saveError && (
            <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 sm:min-w-0">
              <p className="min-w-0 break-words">{saveError}</p>
            </div>
          )}
          {settingsLoading && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-500" />
              Loading saved settings…
            </div>
          )}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {showPg && (
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">Razorpay payment gateway</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Paste your Razorpay Key ID and Key Secret from the Razorpay Dashboard. The secret is stored encrypted
                  on the server and never shown again after save.
                </p>
              </div>
              <div className="shrink-0">{enabledPill}</div>
            </div>
            <div className="space-y-4 p-4">
              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                <div>
                  <label className="text-xs font-medium text-gray-600">Key ID</label>
                  <input
                    type="text"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    autoComplete="off"
                    className={inputClass}
                    placeholder="rzp_live_… or rzp_test_…"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Key secret</label>
                  <input
                    type="password"
                    value={razorpaySecret}
                    onChange={(e) => setRazorpaySecret(e.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder={
                      settings?.hasRazorpaySecret ? "Leave blank to keep existing secret, or enter a new one" : "Required on first save"
                    }
                  />
                  {settings?.hasRazorpaySecret && (
                    <p className="mt-2 text-xs text-gray-600">
                      A secret is already saved. Enter a new value only if you want to replace it.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={savingSection !== null}
                  onClick={handleSaveRazorpay}
                  className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
                >
                  {savingSection === "pg" ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save gateway keys"
                  )}
                </button>
                {settings?.hasRazorpaySecret && (
                  <button
                    type="button"
                    disabled={savingSection !== null}
                    onClick={handleClearSecret}
                    className="w-full rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
                  >
                    Clear secret only
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {showQr && (
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">QR code payments</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload a clear image of your static UPI / payment QR. PNG or JPG, up to 4&nbsp;MB.
                </p>
              </div>
              <div className="shrink-0">{enabledPill}</div>
            </div>
            <div
              className={
                settings?.paymentQrUrl && !qrFile ? "space-y-4 p-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0" : "space-y-4 p-4"
              }
            >
              {settings?.paymentQrUrl && !qrFile && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">Current QR</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={settings.paymentQrUrl}
                    src={checkoutQrImageSrc(settings.paymentQrUrl)}
                    alt="Saved payment QR"
                    className="mx-auto max-h-48 max-w-full rounded border border-gray-200 object-contain sm:max-h-52"
                  />
                </div>
              )}
              <div className="min-w-0 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Upload QR image</label>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setQrFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full min-w-0 text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-800 hover:file:bg-gray-50"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    disabled={savingSection !== null || !qrFile}
                    onClick={handleSaveQr}
                    className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 sm:w-auto"
                  >
                    {savingSection === "qr" && qrFile ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      "Save QR code"
                    )}
                  </button>
                  {settings?.paymentQrUrl && (
                    <button
                      type="button"
                      disabled={savingSection !== null}
                      onClick={handleRemoveQr}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove QR
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {showHelp && (
          <section className="rounded-lg border border-gray-200 bg-white lg:col-span-2">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="flex min-w-0 gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">Company-assisted gateway setup</h2>
                  <p className="mt-1 text-sm text-gray-600">{HELP_COPY}</p>
                </div>
              </div>
              <div className="shrink-0">{enabledPill}</div>
            </div>
            <div className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap sm:gap-3">
              <a
                href={settings?.helpWhatsappUrl || "https://wa.me/917015150181"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:opacity-95 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                WhatsApp — 70151 50181
              </a>
              <a
                href="tel:+917015150181"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50 sm:w-auto"
              >
                <Phone className="h-4 w-4 shrink-0 text-gray-600" />
                Call
              </a>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
