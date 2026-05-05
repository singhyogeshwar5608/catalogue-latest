import type { Product } from '@/types';

/**
 * Products / services listing page: match search on title, price (as text), store name,
 * and store location fields (same idea as marketplace search).
 */
export function productListingMatchesSearch(
  item: Product & {
    storeUsername?: string;
    storeSlug?: string;
    storeLocation?: string | null;
    storeState?: string | null;
    storeDistrict?: string | null;
  },
  query: string,
): boolean {
  const raw = query.trim();
  if (raw === '') return true;

  const q = raw.toLowerCase();

  const includes = (value: unknown) =>
    value != null && value !== '' && String(value).toLowerCase().includes(q);

  if (
    [
      item.name,
      item.description,
      item.category,
      item.storeName,
      item.storeSlug,
      item.storeUsername,
      item.storeLocation,
      item.storeState,
      item.storeDistrict,
    ].some((v) => includes(v))
  ) {
    return true;
  }

  const priceLike = (n: number | null | undefined) => {
    if (n == null || Number.isNaN(n)) return false;
    const s = String(n);
    if (s.toLowerCase().includes(q)) return true;
    const strip = (x: string) => x.replace(/[,\s]/g, '');
    if (strip(s).includes(strip(raw))) return true;
    try {
      return n.toLocaleString('en-IN').toLowerCase().includes(q);
    } catch {
      return false;
    }
  };

  if (
    priceLike(item.price) ||
    priceLike(item.originalPrice) ||
    priceLike(item.discountPrice ?? null) ||
    priceLike(item.wholesalePrice ?? null)
  ) {
    return true;
  }

  return false;
}
