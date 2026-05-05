import { NextResponse } from 'next/server';
import { deleteCacheByPattern } from '@/lib/cache';
import { withCache } from '@/lib/withCache';
import {
  findExampleProduct,
  removeExampleProduct,
  updateExampleProduct,
} from '@/lib/examples/inMemoryProductStore';

/** No time-based expiry — cleared on `PUT` / `DELETE` for this resource. */
const CACHE_TTL = null;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/products/:id
 * Cache key: `products:<id>`
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const cacheKey = `products:${id}`;

  const product = await withCache(
    cacheKey,
    async () => findExampleProduct(id),
    CACHE_TTL,
    { skipSetIf: (row) => row === null },
  );

  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(product);
}

/**
 * PUT /api/products/:id
 * Body: { "name"?: string, "price"?: number }
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  const patch: Partial<{ name: string; price: number }> = {};
  if (typeof body?.name === 'string') patch.name = body.name;
  if (typeof body?.price === 'number' && Number.isFinite(body.price)) patch.price = body.price;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Provide name and/or price' }, { status: 400 });
  }

  const updated = updateExampleProduct(id, patch);

  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await deleteCacheByPattern('products:*');

  return NextResponse.json(updated);
}

/**
 * DELETE /api/products/:id
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const removed = removeExampleProduct(id);

  if (!removed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await deleteCacheByPattern('products:*');

  return NextResponse.json({ ok: true });
}
