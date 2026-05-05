import InfoPageLayout from '@/components/marketing/InfoPageLayout';

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      eyebrow="Privacy Policy"
      title="A simple overview of how information is handled."
      description="This page explains what data may be collected when users browse Cateloge, create stores, manage dashboards, or contact support. The content is intentionally simplified for readability on mobile."
      heroNote="This summary is informational and can be expanded into a full legal policy later."
      sections={[
        {
          title: 'Information we may collect',
          bullets: [
            'Basic account details such as name, email, phone number, and store information.',
            'Marketplace activity linked to listings, store setup, and support interactions.',
            'Technical usage information required for performance, reliability, and fraud prevention.',
          ],
        },
        {
          title: 'How data may be used',
          bullets: [
            'To operate storefront features and maintain user accounts.',
            'To improve support, product quality, and marketplace performance.',
            'To detect abuse, reduce fraud risk, and protect platform integrity.',
          ],
        },
        {
          title: 'Sharing and access',
          body:
            'Public store information is visible to marketplace visitors by design. Sensitive account information should only be used for operational support and platform maintenance.',
        },
        {
          title: 'Your choices',
          body:
            'Users can contact support for account-related requests, store detail corrections, or questions about how profile information appears publicly.',
        },
      ]}
      ctaTitle="Need help with privacy-related questions?"
      ctaDescription="Reach out if you need support around account details, public profile information, or data handling questions."
      ctaHref="/contact"
      ctaLabel="Contact Us"
    />
  );
}
