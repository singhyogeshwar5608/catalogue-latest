import Link from 'next/link';
import InfoPageLayout from '@/components/marketing/InfoPageLayout';

const posts = [
  {
    title: 'How local stores can look more trustworthy online',
    excerpt:
      'A practical guide to improving profile quality, using reviews well, and keeping your catalog clearer for mobile shoppers.',
    href: '/contact',
  },
  {
    title: 'Why mobile-first storefronts matter for neighborhood commerce',
    excerpt:
      'Most discovery now starts on phones. This is what local businesses should optimize first to get better conversions.',
    href: '/contact',
  },
  {
    title: 'What shoppers expect before they contact a store',
    excerpt:
      'Location accuracy, clear pricing signals, catalog quality, and response speed matter more than fancy branding.',
    href: '/contact',
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#ffffff_100%)]">
      <InfoPageLayout
        eyebrow="Blog"
        title="Ideas, product notes, and practical guidance for local commerce."
        description="We use this space to share marketplace learnings, seller growth tips, and product thinking that helps local stores perform better online."
        heroNote="Fresh content modules can be expanded later into a full CMS-backed blog."
        stats={[
          { label: 'Topics', value: 'Growth' },
          { label: 'Focus', value: 'Mobile' },
          { label: 'Audience', value: 'Stores' },
        ]}
        cards={[
          {
            title: 'Seller growth',
            description:
              'Actionable strategies for improving visibility, trust, and conversion inside a local marketplace.',
          },
          {
            title: 'Product updates',
            description:
              'Launch notes and improvements that affect storefront design, reviews, support flows, and discovery.',
          },
          {
            title: 'Marketplace insights',
            description:
              'Patterns we see across shoppers, store behavior, and mobile browsing habits in local commerce.',
          },
        ]}
        ctaTitle="Want tailored advice for your store?"
        ctaDescription="Reach out and we can help you understand how to present your storefront better for local buyers."
        ctaHref="/contact"
        ctaLabel="Talk to Us"
        aside={
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Editorial note</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              This page is ready as a professional placeholder and can later be connected to dynamic blog content.
            </p>
          </div>
        }
      />

      <section className="-mt-8 px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article key={post.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.28)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Article</p>
                <h2 className="mt-3 text-xl font-semibold text-slate-900">{post.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{post.excerpt}</p>
                <Link href={post.href} className="mt-5 inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800">
                  Read more
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
