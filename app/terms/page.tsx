import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function TermsPage() {
  return (
    <InfoPageLayout
      eyebrow="Terms of Service"
      title="Clear operating rules for using Cateloge."
      description="This summary-style terms page explains the platform relationship between Cateloge, sellers, and shoppers. It is written to be readable on mobile while still setting clear usage expectations."
      heroNote="This is a product-facing summary page, not legal advice."
      sections={[
        {
          title: 'Platform usage',
          bullets: [
            'Users must provide accurate account and store information.',
            'Sellers are responsible for the content, pricing, and accuracy of their listings.',
            'Platform features may evolve over time as services, plans, and trust systems improve.',
          ],
        },
        {
          title: 'Acceptable conduct',
          bullets: [
            'Do not misuse reviews, impersonate businesses, or upload deceptive content.',
            'Do not attempt to interfere with marketplace performance, discovery ranking, or security systems.',
            'Repeated policy violations may lead to visibility restrictions or account action.',
          ],
        },
        {
          title: 'Subscriptions and paid features',
          body:
            'Paid plans, boosts, and other marketplace visibility tools may be offered with separate billing terms. Sellers should review plan details carefully before purchasing.',
        },
        {
          title: 'Liability and service continuity',
          body:
            'We aim to keep the service available and useful, but uptime, ranking placement, or traffic outcomes cannot be guaranteed in all conditions.',
        },
      ]}
      ctaTitle="Need clarification on account or platform usage?"
      ctaDescription="The support team can help explain product-facing rules and account workflows."
      ctaHref="/contact"
      ctaLabel="Contact Support"
    />
  );
}
