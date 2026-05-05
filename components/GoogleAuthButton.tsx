'use client';

import { getGoogleOAuthApiBaseUrl } from '@/src/lib/api';
import { useState } from 'react';

const GoogleMark = ({ className = 'h-[18px] w-[18px]' }: { className?: string }) => (
  <svg className={`shrink-0 ${className}`} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8445a4.1428 4.1428 0 0 1-1.7977 2.7172v2.2589h2.9081c1.7036-1.5691 2.6851-3.881 2.6851-6.6166Z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.4672-.8059 5.9568-2.1798l-2.9081-2.2589c-.8066.54-1.8376.8591-3.0487.8591-2.3448 0-4.3295-1.5832-5.0376-3.7106H.9572V13.09C2.4377 15.9832 5.4818 18 9 18Z" fill="#34A853" />
    <path d="M3.9374 10.7106A4.9725 4.9725 0 0 1 3.75 9c0-.8191.1462-1.6044.4124-2.2953V4.6368H.9572A9.996 9.996 0 0 0 0 9c0 1.6144.3845 3.1383 1.0636 4.4895l2.8738-2.7789Z" fill="#FBBC05" />
    <path d="M9 3.58c1.3213 0 2.5083.4542 3.4404 1.346l2.5813-2.5813C13.4632.8914 11.426 0 9 0 5.4818 0 2.4377 2.0168.9572 4.6368l2.8738 2.7789C4.6676 5.1632 6.6552 3.58 9 3.58Z" fill="#EA4335" />
  </svg>
);

interface GoogleAuthButtonProps {
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  /** Side-by-side with email login: white pill, logo + short label (e.g. "Sign in"). */
  compact?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  redirectTo,
  className = '',
  children = 'Sign in with Google',
  disabled = false,
  compact = false,
}) => {
  const [connecting, setConnecting] = useState(false);

  const handleGoogleLogin = () => {
    if (typeof window === 'undefined') return;
    if (connecting) return;
    setConnecting(true);

    const params = new URLSearchParams();
    if (redirectTo) {
      params.set('redirect', redirectTo);
    }

    const base = getGoogleOAuthApiBaseUrl();
    const googleUrl = `${base}/auth/google${params.toString() ? '?' + params.toString() : ''}`;
    window.location.href = googleUrl;
  };

  const label = connecting ? (compact ? '…' : 'Connecting to Google...') : children;
  const isDisabled = disabled || connecting;

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isDisabled}
        className={`inline-flex h-9 min-h-0 flex-1 min-w-0 basis-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-60 md:h-10 md:text-sm ${className}`}
      >
        <GoogleMark className="h-4 w-4 md:h-[18px] md:w-[18px]" />
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={isDisabled}
      className={`flex w-full items-center justify-center gap-3 rounded-full border border-black/80 bg-black py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/40 disabled:opacity-60 md:py-3 md:text-sm ${className}`}
    >
      <span className="flex items-center justify-center rounded-full bg-white p-1">
        <GoogleMark />
      </span>
      {label}
    </button>
  );
};
