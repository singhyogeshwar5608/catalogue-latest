<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    // Include nested prefixes (bootstrap/app.php registers `api/v1/v1` and `v1/v1`).
    'paths' => ['api/*', 'api/v1/v1/*', 'v1/*', 'v1/v1/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Development origins (when APP_ENV=local)
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',

        // Production origins (when APP_ENV=production)
        'https://larawans.com',
        'http://larawans.com',
        'https://www.larawans.com',
        'http://www.larawans.com',

        // AWS Amplify production URL
        'https://main.d2euv5dilboqrn.amplifyapp.com',

        // Add more production domains as needed
        // 'https://yourdomain.com',
    ],

    // Any localhost / 127.0.0.1 port (Next.js dev, etc.)
    'allowed_origins_patterns' => [
        '/^http:\/\/localhost:\d+$/',
        '/^http:\/\/127\.0\.0\.1:\d+$/',
        // Next dev opened via LAN IP (matches allowedDevOrigins in next.config)
        '/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/',
        '/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    /** Cache preflight in browser (seconds); reduces OPTIONS traffic to origin/CDN. */
    'max_age' => 600,

    'supports_credentials' => false,

];
