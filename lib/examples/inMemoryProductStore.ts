/**
 * In-memory demo store for `/api/products` examples only.
 * Replace calls with your database / ORM / external API layer.
 */

export type ExampleProduct = {
  id: string;
  name: string;
  price: number;
  updatedAt: string;
};

const state: { rows: ExampleProduct[] } = {
  rows: [
    {
      id: 'demo-1',
      name: 'Example product',
      price: 99,
      updatedAt: new Date().toISOString(),
    },
  ],
};

export function listExampleProducts(): ExampleProduct[] {
  return state.rows;
}

export function findExampleProduct(id: string): ExampleProduct | null {
  return state.rows.find((r) => r.id === id) ?? null;
}

export function addExampleProduct(input: { id?: string; name: string; price: number }): ExampleProduct {
  const row: ExampleProduct = {
    id: input.id?.trim() || `p-${Date.now()}`,
    name: input.name.trim(),
    price: input.price,
    updatedAt: new Date().toISOString(),
  };
  state.rows = [...state.rows, row];
  return row;
}

export function updateExampleProduct(
  id: string,
  patch: Partial<Pick<ExampleProduct, 'name' | 'price'>>,
): ExampleProduct | null {
  const idx = state.rows.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const prev = state.rows[idx]!;
  const next: ExampleProduct = {
    ...prev,
    ...(patch.name !== undefined ? { name: String(patch.name).trim() } : {}),
    ...(patch.price !== undefined ? { price: Number(patch.price) } : {}),
    updatedAt: new Date().toISOString(),
  };
  state.rows = [...state.rows.slice(0, idx), next, ...state.rows.slice(idx + 1)];
  return next;
}

export function removeExampleProduct(id: string): boolean {
  const before = state.rows.length;
  state.rows = state.rows.filter((r) => r.id !== id);
  return state.rows.length < before;
}
