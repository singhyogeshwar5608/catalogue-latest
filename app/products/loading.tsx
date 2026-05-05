export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-label="Loading products">
      <div className="mb-8 h-10 w-48 animate-pulse rounded-lg bg-slate-200/80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-slate-200/80" />
        ))}
      </div>
    </div>
  );
}
