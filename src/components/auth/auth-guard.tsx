'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isInitializing, router]);

  if (isInitializing || !isAuthenticated) {
    return (
      <main className='flex min-h-screen items-center justify-center bg-[#09090D] text-white'>
        <div className='flex items-center gap-3 text-sm text-zinc-400'>
          <LoaderCircle className='size-5 animate-spin text-purple-400' />
          {isInitializing
            ? 'Restoring your session...'
            : 'Redirecting to login...'}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
