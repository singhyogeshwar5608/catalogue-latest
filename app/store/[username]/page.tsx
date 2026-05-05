import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Store } from '@/types';
import { perfLog } from '@/src/lib/perfLog';
import {
  serverFetchStoreWithRaw,
  serverGetProductsForStoreBackend,
  serverGetServicesForStoreBackend,
  serverGetStoreReviews,
} from '@/src/lib/serverApi';
import StorePageClient from './StorePageClient';

type StorePageProps = {
  params: Promise<{ username: string }>;
};

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://larawans.com';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;

type StoreSeoPayload = Partial<Store> & {
  seo_keywords?: string | null;
  keywords?: string | null;
  state?: string | null;
  district?: string | null;
};

function toAbsoluteAssetUrl(input?: string | null): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }

  const siteBase = SITE_URL.replace(/\/+$/, '');
  if (value.startsWith('/')) {
    return `${siteBase}${value}`;
  }
  if (value.startsWith('storage/')) {
    return `${siteBase}/${value}`;
  }
  if (value.startsWith('store-logos/') || value.startsWith('products/')) {
    return `${siteBase}/storage/${value}`;
  }

  const apiOrigin = (() => {
    try {
      return new URL(API_BASE).origin;
    } catch {
      return siteBase;
    }
  })();

  return `${apiOrigin}/${value.replace(/^\/+/, '')}`;
}

const getStorePageBundle = cache(async (username: string) => {
  perfLog('store', `RSC bundle start ${username}`);
  const row = await serverFetchStoreWithRaw(username);
  if (!row) return null;
  const [products, services, reviewsPayload] = await Promise.all([
    serverGetProductsForStoreBackend(row.backend),
    serverGetServicesForStoreBackend(row.backend),
    serverGetStoreReviews(row.store.id, 1, 5),
  ]);
  perfLog('store', `RSC bundle ready ${username}`);
  return {
    store: row.store,
    products,
    services,
    reviews: reviewsPayload?.reviews ?? [],
    reviewSummary: reviewsPayload?.summary ?? null,
    reviewPagination: reviewsPayload?.pagination ?? null,
  };
});

function buildKeywords(store: StoreSeoPayload | null): string {
  if (!store) return 'store, online shopping, marketplace';
  const explicit = (store.seo_keywords ?? store.keywords ?? '').trim();
  if (explicit) return explicit;
  const parts = [store.name, store.categoryName, store.location, 'buy online', 'marketplace'].filter(Boolean);
  return parts.join(', ');
}

function buildSeoDescription(store: StoreSeoPayload): string {
  const raw = String(store.description ?? store.shortDescription ?? '').trim();
  if (raw) return raw.slice(0, 160);

  const name = String(store.name ?? 'This store').trim();
  const area = String(store.location ?? '').trim();
  if (area) {
    return `Shop online from ${name} in ${area}. Explore products, trusted service, and fast support on our marketplace.`.slice(
      0,
      160
    );
  }
  return `Shop online from ${name}. Explore products, trusted service, and fast support on our marketplace.`.slice(
    0,
    160
  );
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { username } = await params;
  const bundle = await getStorePageBundle(username);
  if (!bundle) {
    const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
    return {
      title: 'Store Not Found',
      description: 'The requested store could not be found.',
      alternates: { canonical },
      robots: { index: false, follow: true },
      openGraph: {
        title: 'Store Not Found',
        description: 'The requested store could not be found.',
        url: canonical,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: 'Store Not Found',
        description: 'The requested store could not be found.',
      },
    };
  }

  const store = bundle.store as StoreSeoPayload;
  const state = (store?.state ?? '').trim();
  const district = (store?.district ?? '').trim();
  const locPhrase =
    district && state
      ? `${district}, ${state}`
      : district || state || (store?.location ? String(store.location).trim() : '');
  const hasLoc = Boolean(locPhrase);
  const title =
    store?.name && hasLoc
      ? `${store.name} in ${locPhrase}`
      : store?.name
        ? `${store.name} - Buy Online`
        : 'Store - Buy Online';
  const description =
    store?.name && hasLoc
      ? `Buy from ${store.name} located in ${locPhrase}.`.slice(0, 160)
      : buildSeoDescription(store);
  const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
  const keywords = buildKeywords(store);
  const logo = toAbsoluteAssetUrl(store.logo ?? null);
  const faviconVersionRaw =
    (store as { updated_at?: string })?.updated_at ??
    (store as { updatedAt?: string })?.updatedAt ??
    store.id ??
    username;
  const faviconVersion = String(faviconVersionRaw ?? username).trim() || username;
  const faviconUrl =
    logo
      ? `${logo}${logo.includes('?') ? '&' : '?'}v=${encodeURIComponent(faviconVersion)}`
      : null;

  const appLabel = String(store.name ?? 'Store').trim() || 'Store';
  const appleTitle = appLabel.length > 24 ? `${appLabel.slice(0, 24)}…` : appLabel;

  return {
    title,
    description,
    keywords,
    applicationName: appLabel,
    appleWebApp: {
      capable: true,
      title: appleTitle,
      statusBarStyle: 'default',
    },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: logo ? [{ url: logo, alt: `${store.name ?? 'Store'} logo` }] : undefined,
    },
    twitter: {
      card: logo ? 'summary_large_image' : 'summary',
      title,
      description,
      images: logo ? [logo] : undefined,
    },
    icons: faviconUrl
      ? {
          icon: [
            { url: faviconUrl, sizes: '32x32' },
            { url: faviconUrl, sizes: '48x48' },
          ],
          shortcut: [{ url: faviconUrl }],
          apple: [{ url: faviconUrl, sizes: '180x180' }],
        }
      : undefined,
    other: {
      ...(logo ? { 'og:image': logo } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { username } = await params;
  const bundle = await getStorePageBundle(username);
  if (!bundle) {
    notFound();
  }
  const canonical = `${SITE_URL.replace(/\/+$/, '')}/store/${encodeURIComponent(username)}`;
  const regionState = (bundle.store?.state ?? '').trim();
  const regionDistrict = (bundle.store?.district ?? '').trim();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: bundle.store.name ?? 'Store',
    url: canonical,
    description: buildSeoDescription(bundle.store as StoreSeoPayload),
    ...(regionState || regionDistrict
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(regionDistrict ? { addressLocality: regionDistrict } : {}),
            ...(regionState ? { addressRegion: regionState } : {}),
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <StorePageClient
        username={username}
        initialStore={bundle.store}
        initialProducts={bundle.products}
        initialServices={bundle.services}
        initialReviews={bundle.reviews}
        initialReviewSummary={bundle.reviewSummary}
        initialReviewPagination={bundle.reviewPagination}
        serverHydrated
      />
    </>
  );
}
