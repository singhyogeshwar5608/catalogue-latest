import Link from 'next/link';
import type { ReactNode } from 'react';
import { Phone } from 'lucide-react';

type InfoCard = {
  title: string;
  description: string;
};

type InfoSection = {
  title: string;
  body?: string;
  bullets?: string[];
};

type InfoPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  heroNote?: string;
  stats?: Array<{ label: string; value: string }>;
  cards?: InfoCard[];
  sections?: InfoSection[];
  ctaTitle?: string;
  ctaDescription?: string;
  ctaHref?: string;
  ctaLabel?: string;
  /** e.g. tel:7015150181 */
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  /** When "top", the CTA band renders above the hero grid; otherwise after cards/sections. */
  ctaPlacement?: 'top' | 'bottom';
  aside?: ReactNode;
};

export default function InfoPageLayout({
  eyebrow,
  title,
  description,
  heroNote,
  stats = [],
  cards = [],
  sections = [],
  ctaTitle,
  ctaDescription,
  ctaHref = '/create-store',
  ctaLabel = 'Create Your Store',
  secondaryCtaHref,
  secondaryCtaLabel = 'Call',
  ctaPlacement = 'bottom',
  aside,
}: InfoPageLayoutProps) {
  const ctaSection =
    ctaTitle != null && ctaTitle !== '' ? (
      <section className="rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#1d4ed8_100%)] px-5 py-6 text-white shadow-[0_30px_80px_-45px_rgba(15,23,42,0.9)] sm:px-7 sm:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[21px] font-semibold leading-snug">{ctaTitle}</h2>
            {ctaDescription ? (
              <p className="mt-[10px] max-w-2xl text-[11px] leading-[26px] text-slate-200">{ctaDescription}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:shrink-0">
            {secondaryCtaHref ? (
              <a
                href={secondaryCtaHref}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-white/85 bg-white/10 px-3.5 py-2 text-[11px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {secondaryCtaLabel}
              </a>
            ) : null}
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-white px-3.5 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </section>
    ) : null;

  const hasLowerContent =
    cards.length > 0 || sections.length > 0 || (ctaSection != null && ctaPlacement === 'bottom');

  const topSectionPb = hasLowerContent ? 'pb-10 lg:pb-14' : 'pb-4 sm:pb-5 lg:pb-6';

  return (
    <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#ffffff_100%)]">
      <section className={`px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12 ${topSectionPb}`}>
        <div className="mx-auto max-w-6xl">
          {ctaSection != null && ctaPlacement === 'top' ? (
            <div className={hasLowerContent ? 'mb-6 lg:mb-8' : 'mb-4 lg:mb-5'}>{ctaSection}</div>
          ) : null}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="overflow-hidden rounded-[28px] bg-slate-950 px-5 py-6 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] sm:px-7 sm:py-7">
              <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-cyan-300">{eyebrow}</p>
              <h1 className="mt-[14px] max-w-3xl text-[27px] font-semibold leading-snug sm:text-[33px]">{title}</h1>
              <p className="mt-[14px] max-w-2xl text-[11px] leading-[26px] text-slate-200 sm:text-[13px]">{description}</p>
              {heroNote ? (
                <p className="mt-[14px] inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-medium text-slate-200 sm:text-[11px]">
                  {heroNote}
                </p>
              ) : null}
              {stats.length > 0 ? (
                <div className="mt-[30px] grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{stat.label}</p>
                      <p className="mt-[6px] text-[21px] font-semibold leading-none text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.25)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Quick Access</p>
              <div className="mt-4 space-y-3">
                <Link className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="/help-center">
                  Help Center
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="/contact">
                  Contact Support
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50" href="/all-stores">
                  Browse Stores
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              {aside ? <div className="mt-6">{aside}</div> : null}
            </div>
          </div>
        </div>
      </section>

      {hasLowerContent ? (
        <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <div className="mx-auto max-w-6xl space-y-10">
            {cards.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <article key={card.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)]">
                    <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                  </article>
                ))}
              </div>
            ) : null}

            {sections.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {sections.map((section) => (
                  <section key={section.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.28)]">
                    <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                    {section.body ? <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p> : null}
                    {section.bullets && section.bullets.length > 0 ? (
                      <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 flex-none rounded-full bg-cyan-500" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : null}

            {ctaSection != null && ctaPlacement === 'bottom' ? ctaSection : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
