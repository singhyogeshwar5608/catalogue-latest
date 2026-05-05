export default function AllStoresLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-label="Loading stores">
      <div className="mb-6 h-10 w-56 animate-pulse rounded-lg bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl bg-slate-200/80" />
        ))}
      </div>
    </div>
  );
}
