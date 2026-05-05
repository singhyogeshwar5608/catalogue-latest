'use client';

import Link from 'next/link';
import { ChevronRight, Store } from 'lucide-react';

/** Full-width promo strip directly above `<Footer>` on public routes. */
export default function FooterSellCtaBanner() {
  return (
    <section
      className="relative border-t border-rose-100/70 bg-gradient-to-b from-[#fdf8fb] via-white to-white"
      aria-labelledby="footer-sell-cta-heading"
    >
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-8 md:py-10 lg:px-8">
        <div className="relative overflow-visible rounded-2xl border border-rose-100/90 bg-white py-2.5 pl-2.5 pr-2 shadow-[0_18px_44px_-22px_rgba(225,29,72,0.3)] ring-1 ring-rose-50/80 sm:rounded-3xl sm:p-6 md:p-8">
          <div
            className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full bg-gradient-to-br from-rose-100/50 to-fuchsia-100/35 blur-2xl sm:-right-6 sm:-top-6 sm:h-40 sm:w-40 sm:blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 left-0 h-24 w-36 rounded-full bg-rose-50/70 blur-2xl sm:-bottom-8 sm:h-32 sm:w-48"
            aria-hidden
          />

          <div
            className="absolute -top-2 right-2.5 z-10 flex items-center gap-0.5 rounded-full border border-amber-200/90 bg-gradient-to-b from-amber-50 to-amber-100/90 px-2 py-0.5 text-[9px] font-semibold text-amber-950 shadow sm:-top-3 sm:right-6 sm:gap-1 sm:px-3 sm:py-1 sm:text-xs"
            role="status"
          >
            <span className="text-[0.8rem] leading-none sm:text-[0.95rem]" aria-hidden>
              💰
            </span>
            <span className="whitespace-nowrap">Earn money</span>
          </div>

          {/* Horizontal row on all breakpoints; compact on small screens */}
          <div className="relative flex flex-row items-center justify-between gap-1.5 sm:gap-6 lg:gap-10 min-[400px]:gap-2.5">
            <div className="min-w-0 flex-1 pt-2 sm:pt-3 lg:pt-1">
              <span className="inline-flex rounded bg-gradient-to-r from-rose-500 to-fuchsia-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.12em] md:text-[11px]">
                New
              </span>
              <h2
                id="footer-sell-cta-heading"
                className="mt-1 text-[10px] font-bold leading-[1.3] tracking-tight text-slate-900 min-[400px]:text-[11px] min-[400px]:leading-snug sm:mt-3 sm:max-w-xl sm:text-xl sm:leading-snug md:text-2xl lg:max-w-none lg:text-3xl"
              >
                <span className="sm:hidden">Start earning today by creating your own shop!</span>
                <span className="hidden sm:inline">Open your shop today and start earning.</span>
              </h2>
              <p className="mt-0.5 text-[8.5px] leading-[1.35] text-slate-600 min-[400px]:text-[9px] min-[400px]:mt-1 sm:mt-2.5 sm:max-w-lg sm:text-sm md:text-[0.95rem]">
                Free setup · No commission · Grow your business
              </p>
            </div>

            <div className="flex shrink-0 flex-row items-center gap-0 sm:gap-3 lg:gap-4">
              <svg
                className="h-[1.65rem] w-[2.1rem] shrink-0 text-slate-800/72 min-[400px]:h-7 min-[400px]:w-9 sm:h-[3.25rem] sm:w-[4.75rem] lg:h-14 lg:w-[6.25rem]"
                viewBox="0 0 96 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M8 44c12-2 22-8 28-16 6-9 8-20 4-28 6 4 10 10 12 17"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M76 8l8 8-8 8"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <Link
                href="/create-store"
                className="group inline-flex max-h-[3rem] shrink-0 flex-row items-center justify-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 px-2 py-1.5 text-[7px] font-bold leading-none text-white shadow-[0_10px_28px_-12px_rgba(225,29,72,0.55)] transition hover:brightness-[1.06] min-[380px]:text-[8px] min-[400px]:gap-1.5 min-[400px]:px-3 min-[400px]:py-2 min-[400px]:text-[9px] sm:px-6 sm:py-3.5 sm:text-sm md:px-8 md:py-4 md:text-base"
              >
                <Store
                  className="h-3 w-3 shrink-0 text-white/95 min-[400px]:h-3.5 min-[400px]:w-3.5 sm:h-5 sm:w-5"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <span className="max-w-[4.85rem] whitespace-nowrap sm:max-w-none">Start selling now</span>
                <ChevronRight
                  className="hidden h-3 w-3 shrink-0 transition group-hover:translate-x-0.5 min-[400px]:inline sm:h-5 sm:w-5"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
