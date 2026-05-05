import type { Metadata } from 'next';
import Link from 'next/link';
import type { Store } from '@/types';
import { fetchStoresFromLaravel } from '@/lib/server/laravel-stores';

type LocationStoresPageProps = {
  params: Promise<{ state: string; district: string }>;
};

const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'https://larawans.com'
).replace(/\/+$/, '');

/** Turn URL segment `south-delhi` → "South Delhi" for readable headings. */
function slugSegmentToLabel(segment: string): string {
  const decoded = decodeURIComponent(segment);
  return decoded
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export async function generateMetadata({ params }: LocationStoresPageProps): Promise<Metadata> {
  const { state, district } = await params;
  const stateLabel = slugSegmentToLabel(state);
  const districtLabel = slugSegmentToLabel(district);
  const title = `Best Stores in ${districtLabel}, ${stateLabel}`;
  const description = `Explore top stores in ${districtLabel}, ${stateLabel}`;
  const canonical = `${SITE_URL}/stores/${encodeURIComponent(state)}/${encodeURIComponent(district)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    robots: { index: true, follow: true },
  };
}

/**
 * Server-rendered listing for `/stores/{state}/{district}`.
 * Upstream: Laravel `GET /stores?state=&district=&limit=` (see StoreController::listStores).
 */
export default async function LocationStoresPage({ params }: LocationStoresPageProps) {
  const { state, district } = await params;

  const qs = new URLSearchParams({
    state,
    district,
    limit: '100',
  });
  let stores: Store[] = [];
  try {
    stores = await fetchStoresFromLaravel(qs.toString());
  } catch {
    stores = [];
  }

  const stateLabel = slugSegmentToLabel(state);
  const districtLabel = slugSegmentToLabel(district);
  const heading = `Stores in ${districtLabel}, ${stateLabel}`;

  const itemListJsonLd =
    stores.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: heading,
          numberOfItems: stores.length,
          itemListElement: stores.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/store/${encodeURIComponent(s.username)}`,
            name: s.name,
          })),
        }
      : null;

  return (
    <>
      {itemListJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      ) : null}
      <main className="mx-auto min-h-[40vh] max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{heading}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Browse verified sellers on our marketplace{stores.length ? ` · ${stores.length} store${stores.length === 1 ? '' : 's'} found` : ''}.
          </p>
        </header>

        {stores.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No stores found in this area yet. Try another district or check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {stores.map((store) => (
              <li key={store.id}>
                <Link
                  href={`/store/${encodeURIComponent(store.username)}`}
                  className="block px-4 py-4 transition hover:bg-slate-50/80"
                >
                  <span className="font-medium text-slate-900">{store.name}</span>
                  {store.location ? (
                    <span className="mt-0.5 block text-sm text-slate-500">{store.location}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
