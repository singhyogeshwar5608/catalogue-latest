"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import {
  prefetchFreeTrialDays,
  trialEndsAtFallbackFromCreated,
} from "@/src/lib/freeTrialDays";

function parseEndMs(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Drives countdown; also syncs when the tab was backgrounded (timers can be throttled). */
function useTick(ms = 1000) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setT(Date.now());
    const id = setInterval(tick, ms);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);
  return t;
}

function splitRemaining(endMs: number, now: number) {
  const diff = Math.max(0, endMs - now);
  const sec = Math.floor(diff / 1000);
  return {
    totalMs: diff,
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
  };
}

type TrialCountdownBannerProps = {
  trialEndsAt?: string | null;
  /** Store creation time — used with DB `free_trial_days` if `trialEndsAt` is missing. */
  createdAt?: string | null;
  /** Laravel JSON root (e.g. same-origin `/api/laravel` in dev) so we can load `free_trial_days`. */
  apiBaseUrl?: string;
  hasActiveSubscription: boolean;
};

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-lg border border-white/30 bg-white/15 px-1.5 py-2 sm:px-2 sm:py-2.5">
      <span className="font-mono text-base font-bold tabular-nums leading-none text-white sm:text-lg">{value}</span>
      <span className="mt-1 max-w-full truncate text-[10px] font-semibold uppercase tracking-wide text-white/75 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

export default function TrialCountdownBanner({
  trialEndsAt,
  createdAt,
  apiBaseUrl,
  hasActiveSubscription,
}: TrialCountdownBannerProps) {
  const now = useTick(1000);
  const [trialDaysReady, setTrialDaysReady] = useState(false);

  useEffect(() => {
    const base = apiBaseUrl?.trim();
    if (!base) {
      setTrialDaysReady(true);
      return;
    }
    let cancelled = false;
    void prefetchFreeTrialDays(base).finally(() => {
      if (!cancelled) setTrialDaysReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const endMs = useMemo(() => {
    const direct = parseEndMs(trialEndsAt);
    if (direct != null) return direct;
    if (!createdAt) return null;
    const fb = trialEndsAtFallbackFromCreated(createdAt);
    return parseEndMs(fb);
  }, [trialEndsAt, createdAt, trialDaysReady]);

  if (hasActiveSubscription || !endMs) {
    return null;
  }

  const parts = splitRemaining(endMs, now);
  const expired = parts.totalMs <= 0;
  const hoursLeft = parts.days * 24 + parts.hours;
  const isUrgent = !expired && hoursLeft < 24;

  const shell = expired ? "bg-red-900" : isUrgent ? "bg-red-800" : "bg-red-600";

  const headline = expired
    ? "Your trial has ended — subscribe to continue"
    : isUrgent
      ? "Trial ending soon — pick a plan to stay live"
      : "Your trial is active — upgrade before it ends";

  const headlineShort = expired
    ? "Subscribe to keep your store live"
    : isUrgent
      ? "Trial ends in under 24 hours"
      : "Trial active — upgrade before it ends";

  const inlineTime = `${parts.days}d ${String(parts.hours).padStart(2, "0")}h ${String(parts.minutes).padStart(2, "0")}m ${String(parts.seconds).padStart(2, "0")}s`;

  return (
    <section
      role="status"
      aria-live="polite"
      className={`relative box-border w-full min-w-0 max-w-full overflow-hidden rounded-lg p-2 text-white shadow-md sm:rounded-xl sm:p-4 sm:shadow-lg ${shell}`}
    >
      {/* Mobile: one tight strip — short copy + single-line time + tiny link */}
      <div className="flex min-w-0 flex-col gap-1.5 sm:hidden">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/20">
            {expired ? <Clock className="h-3.5 w-3.5 text-white" /> : <Sparkles className="h-3.5 w-3.5 text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wide text-white/90">Free trial</span>
            <p className="text-[11px] font-semibold leading-snug text-white">{headlineShort}</p>
          </div>
        </div>
        {!expired ? (
          <div className="flex min-w-0 items-center justify-between gap-2 pl-9">
            <p className="min-w-0 truncate font-mono text-base font-bold tabular-nums tracking-tight text-white">
              {inlineTime}
            </p>
            <Link
              href="/dashboard/subscription"
              className="shrink-0 text-[10px] font-bold text-white underline decoration-white/70 underline-offset-2"
            >
              Plans →
            </Link>
          </div>
        ) : (
          <div className="pl-9">
            <Link
              href="/dashboard/subscription"
              className="text-[10px] font-bold text-white underline decoration-white/70 underline-offset-2"
            >
              Choose plan →
            </Link>
          </div>
        )}
      </div>

      {/* sm+: room for cards + CTA */}
      <div className="relative hidden min-w-0 max-w-full flex-col gap-3 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 max-w-full flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 sm:h-11 sm:w-11">
            {expired ? <Clock className="h-5 w-5 text-white" /> : <Sparkles className="h-5 w-5 text-white" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className="inline-flex w-fit max-w-full rounded border border-white/35 bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/95">
              {expired ? "Trial ended" : "Free trial"}
            </span>
            <p className="text-sm font-bold leading-snug text-white sm:text-base">{headline}</p>
          </div>
        </div>

        <div className="flex min-w-0 w-full max-w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:max-w-md sm:flex-row sm:items-center sm:gap-3">
          {!expired ? (
            <div className="w-full min-w-0 sm:flex-1 sm:min-w-[220px]">
              <p className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-white/80 sm:text-left sm:text-xs">
                Time left
              </p>
              <div className="grid min-w-0 grid-cols-4 gap-1.5 sm:gap-2">
                <TimeBlock value={String(parts.days).padStart(2, "0")} label="Days" />
                <TimeBlock value={String(parts.hours).padStart(2, "0")} label="Hrs" />
                <TimeBlock value={String(parts.minutes).padStart(2, "0")} label="Min" />
                <TimeBlock value={String(parts.seconds).padStart(2, "0")} label="Sec" />
              </div>
            </div>
          ) : (
            <p className="w-full text-center text-sm font-semibold text-white/95 sm:text-left">No time remaining</p>
          )}

          <Link
            href="/dashboard/subscription"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-md transition hover:bg-red-50 sm:w-auto"
          >
            {expired ? "Choose a plan" : "View plans & upgrade"}
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </section>
  );
}
