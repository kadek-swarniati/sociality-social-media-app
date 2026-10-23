'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/components/auth/auth-provider';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing || isAuthenticated) {
      return;
    }

    const query = searchParams.toString();
    const returnTo = query ? `${pathname}?${query}` : pathname;

    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [isAuthenticated, isInitializing, pathname, router, searchParams]);

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
