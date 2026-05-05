export default function CreateStoreLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10" aria-busy="true" aria-label="Loading form">
      <div className="mb-8 h-8 w-40 animate-pulse rounded-lg bg-slate-200/80" />
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-200/80" />
        ))}
      </div>
    </div>
  );
}
