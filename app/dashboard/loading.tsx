export default function DashboardSegmentLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-200/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 animate-pulse rounded-xl bg-slate-200/80" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-200/80" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-200/80" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200/80" />
    </div>
  );
}
