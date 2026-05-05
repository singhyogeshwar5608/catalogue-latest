'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { resolvePostAuthRedirect } from '@/src/lib/auth-redirect';

export default function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeExternalLogin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        // Handle OAuth error
        if (error) {
          console.error('OAuth error:', error);
          setError(`Authentication failed: ${error}`);
          setTimeout(() => router.push('/auth'), 3000);
          return;
        }

        // Handle successful callback with token (from backend redirect)
        if (token) {
          console.log('Received token from backend redirect');
          try {
            const loggedInUser = await completeExternalLogin(token);
            const redirect = searchParams.get('redirect');
            router.push(resolvePostAuthRedirect(redirect, loggedInUser));
            return;
          } catch (loginError) {
            console.error('Login completion error:', loginError);
            setError('Failed to complete login');
            setTimeout(() => router.push('/auth'), 3000);
            return;
          }
        }

        // Handle OAuth code (if frontend needs to exchange it)
        if (code) {
          console.log('Received OAuth code, exchanging for token...');
          // This would typically call your backend to exchange the code
          // But since we're using backend redirect flow, this shouldn't happen
          setError('Unexpected OAuth flow. Please try again.');
          setTimeout(() => router.push('/auth'), 3000);
          return;
        }

        // No parameters found
        setError('No authentication data received');
        setTimeout(() => router.push('/auth'), 3000);

      } catch (err) {
        console.error('Callback error:', err);
        setError('Authentication failed');
        setTimeout(() => router.push('/auth'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router, completeExternalLogin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
