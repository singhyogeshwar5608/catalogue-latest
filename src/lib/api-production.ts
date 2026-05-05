'use client';

// Local API (set NEXT_PUBLIC_API_BASE_URL when using php artisan serve)
export const API_BASE_URL_LOCAL = 'http://localhost:8000/api/v1/v1';

export const API_BASE_URL_PRODUCTION = `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;

// Prefer env; otherwise always production API (same as api.ts)
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? API_BASE_URL_PRODUCTION;

const AUTH_TOKEN_HEADER = 'Authorization';
export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

// Rest of the API functions remain the same...
// (Copy all functions from api.ts here)
