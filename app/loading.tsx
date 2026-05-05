export default function RootLoading() {
  return (
    <div
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 px-4"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}
