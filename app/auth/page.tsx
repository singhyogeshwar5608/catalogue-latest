import { Suspense } from 'react';
import AuthPageClient from './AuthPageClient';
import AuthLoading from './loading';

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthPageClient />
    </Suspense>
  );
}
