<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'ipapi' => [
        'url' => env('IPAPI_URL', 'https://ipapi.co/json/'),
    ],

    /*
    | Optional: after mutations that affect cached Next.js catalog data, Laravel POSTs here so Redis keys
    | are cleared (`stores:*`, `products:*`, `users:*` — see App\Support\NextCatalogCacheInvalidate).
    | Match Next's CACHE_INVALIDATE_SECRET.
    */
    'next_cache_invalidate_url' => env('NEXT_CACHE_INVALIDATE_URL'),
    'next_cache_invalidate_secret' => env('NEXT_CACHE_INVALIDATE_SECRET', env('CACHE_INVALIDATE_SECRET')),

    /*
    | Platform Razorpay (ONE pair in `backend/.env`): merchants paying Catelog for their subscription.
    | Customer → merchant product checkout uses only `stores.razorpay_key_id` / `stores.razorpay_key_secret`
    | (StorePaymentIntegrationController) — not these env vars.
    */
    'razorpay' => [
        'key_id' => env('RAZORPAY_KEY_ID', env('RZP_LIVE_KEY_ID')),
        'key_secret' => env('RAZORPAY_KEY_SECRET', env('RZP_LIVE_KEY_SECRET')),
        /**
         * When true, `POST …/subscription/mock-complete` is allowed (also allowed when `APP_ENV=local` even if false here).
         * Default true for now; set `SUBSCRIPTION_MOCK_PAYMENT=false` in `backend/.env` before locking production to real payments only.
         */
        'subscription_mock_payment' => filter_var(
            env('SUBSCRIPTION_MOCK_PAYMENT', 'true'),
            FILTER_VALIDATE_BOOLEAN
        ),
    ],

];
