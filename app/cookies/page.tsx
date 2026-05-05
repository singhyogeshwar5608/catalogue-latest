import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function CookiePolicyPage() {
  return (
    <InfoPageLayout
      eyebrow="Cookie Policy"
      title="How cookies and similar tools support the Cateloge experience."
      description="Cookies can help with login continuity, language preferences, analytics, and performance improvements. This page keeps the explanation brief and understandable for mobile visitors."
      heroNote="Cookie use can be expanded later if consent tooling is introduced."
      sections={[
        {
          title: 'Why cookies may be used',
          bullets: [
            'To keep sign-in and session-related flows working smoothly.',
            'To remember basic preferences and improve convenience for returning users.',
            'To understand product performance and improve page experience over time.',
          ],
        },
        {
          title: 'Types of usage',
          bullets: [
            'Essential cookies for authentication and account continuity.',
            'Preference cookies for language or display-related settings.',
            'Analytics tools to understand how users browse important marketplace pages.',
          ],
        },
        {
          title: 'Managing preferences',
          body:
            'Browser settings may let users control or clear cookies. Some platform features may behave differently if essential cookies are disabled.',
        },
      ]}
      ctaTitle="Questions about browser settings or tracking?"
      ctaDescription="Use the contact page if you need clarification on cookie-related behavior in the platform."
      ctaHref="/contact"
      ctaLabel="Get Support"
    />
  );
}
