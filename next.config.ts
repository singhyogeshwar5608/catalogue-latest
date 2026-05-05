import type { NextConfig } from "next";

/** Origin only (scheme + host + port) for proxying /api/laravel → Laravel /api/v1/v1 */
function laravelProxyOrigin(): string {
  const parseOrigin = (v: string | undefined): string | null => {
    const t = v?.trim();
    if (!t) return null;
    try {
      return new URL(t.includes("://") ? t : `https://${t}`).origin;
    } catch {
      return null;
    }
  };
  /**
   * Default to local `php artisan serve` so dev does not silently hit production when env vars are missing.
   * Point at a remote API explicitly: `BACKEND_PROXY_TARGET=https://your-api.example` or `NEXT_PUBLIC_API_BASE_URL=…`.
   */
  return (
    parseOrigin(process.env.BACKEND_PROXY_TARGET) ??
    parseOrigin(process.env.NEXT_PUBLIC_API_BASE_URL) ??
    "http://127.0.0.1:8000"
  );
}

const nextConfig: NextConfig = {
  /**
   * Allow loading dev assets (/_next/*) when accessing the dev server from LAN IPs / alternate ports.
   * Missing origins here can contribute to ChunkLoadError in dev when not using the default :3000 port.
   */
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://192.168.29.165:3000",
    "http://192.168.29.165:3001",
    "http://192.168.29.165:3002",
  ],
  webpack: (config, { dev, isServer }) => {
    // First client compile can exceed the default chunk load wait on slower disks (common on Windows).
    if (dev && !isServer && config.output && typeof config.output === "object") {
      (config.output as { chunkLoadTimeout?: number }).chunkLoadTimeout = 300_000;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  /**
   * Silence Next.js warning about multiple lockfiles by explicitly setting the tracing root to the project directory.
   */
  outputFileTracingRoot: __dirname,
  /**
   * Exclude backend folder from TypeScript compilation
   */
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  /**
   * Proxies `/api/laravel/*` → Laravel `/api/v1/v1/*`. Target origin: `BACKEND_PROXY_TARGET`, else
   * `NEXT_PUBLIC_API_BASE_URL` host, else `http://127.0.0.1:8000`. Restart `next dev` after env changes.
   */
  async rewrites() {
    const origin = laravelProxyOrigin();
    return [
      {
        source: "/api/laravel/:path*",
        destination: `${origin}/api/v1/v1/:path*`,
      },
      /**
       * Laravel saves payment QR files under `public/store-payment-qr/*`. The API returns root-relative
       * URLs (`/store-payment-qr/...`) so the browser loads them from the Next origin; this forwards to Laravel.
       */
      {
        source: "/store-payment-qr/:path*",
        destination: `${origin}/store-payment-qr/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${origin}/storage/:path*`,
      },
    ];
  },

  /**
   * Add CORS headers for API routes
   */
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
