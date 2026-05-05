import { NextResponse } from 'next/server';
import { deleteCacheByPattern } from '@/lib/cache';
import { withCache } from '@/lib/withCache';
import {
  addExampleProduct,
  listExampleProducts,
  type ExampleProduct,
} from '@/lib/examples/inMemoryProductStore';

/** No time-based expiry — cleared on `POST /api/products` (see handler). */
const CACHE_TTL = null;

function paginate(rows: ExampleProduct[], page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize) ? Math.min(50, Math.max(1, Math.floor(pageSize))) : 10;
  const start = (safePage - 1) * safeSize;
  return {
    page: safePage,
    pageSize: safeSize,
    total: rows.length,
    items: rows.slice(start, start + safeSize),
  };
}

/**
 * GET /api/products?page=1&pageSize=10
 * Cache key: `products:list?<querystring>`
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString() || 'page=1';
  const cacheKey = `products:list?${qs}`;

  const payload = await withCache(
    cacheKey,
    async () => {
      const page = Number(searchParams.get('page')) || 1;
      const pageSize = Number(searchParams.get('pageSize')) || 10;
      return paginate(listExampleProducts(), page, pageSize);
    },
    CACHE_TTL,
  );

  return NextResponse.json(payload);
}

/**
 * POST /api/products
 * Body: { "name": string, "price"?: number, "id"?: string }
 * After mutation: invalidate all `products:*` cache keys.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const price = typeof body?.price === 'number' && Number.isFinite(body.price) ? body.price : 0;
  const id = typeof body?.id === 'string' ? body.id.trim() : undefined;

  addExampleProduct({ name, price, id });

  await deleteCacheByPattern('products:*');

  return NextResponse.json({ ok: true }, { status: 201 });
}
