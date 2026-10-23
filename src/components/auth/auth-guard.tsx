'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing || isAuthenticated) {
      return;
    }

    const query = typeof window !== 'undefined' ? window.location.search : '';

    const returnTo = `${pathname}${query}`;

    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [isAuthenticated, isInitializing, pathname, router]);

  if (isInitializing || !isAuthenticated) {
    return (
      <div
        role='status'
        className='flex min-h-screen items-center justify-center bg-black text-sm text-[#A4A7AE]'
      >
        Checking your session...
      </div>
    );
  }

  return <>{children}</>;
}
