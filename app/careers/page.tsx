import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function CareersPage() {
  return (
    <InfoPageLayout
      eyebrow="Careers"
      title="We are building practical tools for real local businesses."
      description="Cateloge is focused on product decisions that help local commerce work better. We value clarity, speed, strong execution, and thoughtful design that survives real-world usage."
      heroNote="Remote-friendly collaboration with a product mindset."
      stats={[
        { label: 'Team style', value: 'Lean' },
        { label: 'Work mode', value: 'Remote' },
        { label: 'Mindset', value: 'Practical' },
      ]}
      cards={[
        {
          title: 'Product thinking',
          description:
            'We prefer people who can connect design, engineering, and user needs instead of operating in silos.',
        },
        {
          title: 'Execution speed',
          description:
            'Local businesses move fast. We care about shipping improvements that genuinely reduce friction for sellers and buyers.',
        },
        {
          title: 'Ownership',
          description:
            'Each team member is expected to improve the product, not only complete assigned tasks.',
        },
      ]}
      sections={[
        {
          title: 'What we look for',
          bullets: [
            'Good judgment on mobile-first product experiences.',
            'Clear communication and the ability to simplify complexity.',
            'Comfort working across ambiguous problems without waiting for perfect requirements.',
          ],
        },
        {
          title: 'Open roles',
          body:
            'We are not publishing public openings right now, but we review strong profiles for product design, frontend engineering, and growth operations.',
        },
      ]}
      ctaTitle="Interested in working with us?"
      ctaDescription="Send us your profile, portfolio, and a short note about the problems you like solving."
      ctaHref="/contact"
      ctaLabel="Contact Us"
    />
  );
}
