import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function AboutPage() {
  return (
    <InfoPageLayout
      eyebrow="About Cateloge"
      title="Built to help local stores sell with more confidence."
      description="Cateloge helps neighbourhood businesses create digital storefronts, earn trust with verified profiles, and stay discoverable for nearby shoppers on mobile and desktop."
      heroNote="A marketplace designed for Indian local commerce."
      stats={[
        { label: 'Store-first', value: '100%' },
        { label: 'Mobile ready', value: '24/7' },
        { label: 'Focused cities', value: 'Growing' },
      ]}
      cards={[
        {
          title: 'Local-first discovery',
          description:
            'We make it easier for shoppers to find trusted stores nearby instead of getting lost inside generic marketplace listings.',
        },
        {
          title: 'Fast store setup',
          description:
            'Sellers can launch a presentable store, share products and services, and start receiving enquiries in minutes.',
        },
        {
          title: 'Trust-led buying',
          description:
            'Reviews, store badges, contact options, and clear catalog layouts help buyers make decisions faster.',
        },
      ]}
      sections={[
        {
          title: 'What we believe',
          body:
            'Small and mid-sized sellers should not need a complicated enterprise stack to look credible online. The right storefront, mobile experience, and support tools should be simple and accessible.',
        },
        {
          title: 'What Cateloge solves',
          bullets: [
            'Makes local shops searchable through one clean public marketplace.',
            'Helps stores showcase products, services, location, and trust signals in one place.',
            'Improves mobile browsing so most customers can discover and contact stores directly from their phones.',
          ],
        },
      ]}
      ctaTitle="Want to put your store online?"
      ctaDescription="Create your storefront, list your products, and start reaching more nearby customers with a layout that works well on mobile."
    />
  );
}
