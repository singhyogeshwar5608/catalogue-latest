import type { Metadata, Viewport } from "next";
import faviconIcon from '@/assets/icon-512x512.svg';

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '');

export const metadata: Metadata = {
  metadataBase: (() => {
    try {
      return new URL(BASE_URL);
    } catch {
      return new URL('https://larawans.com');
    }
  })(),
  title: "Larawans - Create Your Digital Store",
  description: "Build your online store in minutes. Boost your business with our powerful marketplace platform.",
  /** No global manifest: store pages set `link rel=manifest` via `app/store/[username]/layout.tsx` → `…/manifest.json`. */
  icons: {
    icon: [{ url: faviconIcon.src, type: 'image/svg+xml' }],
    shortcut: [{ url: faviconIcon.src, type: 'image/svg+xml' }],
    apple: [{ url: faviconIcon.src }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};
