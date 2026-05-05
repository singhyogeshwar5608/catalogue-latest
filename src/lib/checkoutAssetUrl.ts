/**
 * URL for displaying seller payment QR in the browser.
 * Prefer the API’s absolute `payment_qr_url` (streams via Laravel, avoids CDN 422 on static paths).
 * Root-relative URLs are resolved against `window.location.origin` for local dev; avoid `next/image` for these.
 */
export function checkoutQrImageSrc(url: string | null | undefined): string {
  if (url == null || typeof url !== "string") return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (typeof window !== "undefined" && u.startsWith("/")) {
    return `${window.location.origin}${u}`;
  }
  return u;
}

function sanitizeQrDownloadBase(raw: string | undefined): string {
  const t = (raw ?? "payment-qr").trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-|-$/g, "");
  return t || "payment-qr";
}

/**
 * Fetch the seller’s QR image and trigger a file download (same-origin / CORS-allowed URLs).
 */
export async function downloadCheckoutQrImage(
  url: string | null | undefined,
  options?: { filenameBase?: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Download is only available in the browser." };
  }
  const src = checkoutQrImageSrc(url);
  if (!src) return { ok: false, message: "No QR image available." };
  const base = sanitizeQrDownloadBase(options?.filenameBase);
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit", cache: "no-store" });
    if (!res.ok) {
      return { ok: false, message: "Could not download the QR image. Try again or take a screenshot." };
    }
    const blob = await res.blob();
    if (!blob.size) {
      return { ok: false, message: "Empty image. Try again later." };
    }
    const mime = blob.type || "image/png";
    const ext = mime.includes("jpeg") || mime.includes("jpg")
      ? "jpg"
      : mime.includes("webp")
        ? "webp"
        : mime.includes("gif")
          ? "gif"
          : "png";
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${base}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Download blocked (network or browser). Open the QR in a new tab to save it.",
    };
  }
}
