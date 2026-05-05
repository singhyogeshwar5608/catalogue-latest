import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://larawans.com';

export default function robots(): MetadataRoute.Robots {
  const origin = SITE_URL.replace(/\/+$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
