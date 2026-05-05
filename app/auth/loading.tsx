export default function AuthLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <div className="h-4 w-48 animate-pulse rounded bg-slate-200/80" />
    </div>
  );
}
