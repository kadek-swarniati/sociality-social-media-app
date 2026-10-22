'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';

export default function HomePage() {
  const router = useRouter();

  const { isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing) return;

    router.replace(isAuthenticated ? '/feed' : '/login');
  }, [isAuthenticated, isInitializing, router]);

  return (
    <main className='flex min-h-screen items-center justify-center bg-black text-white'>
      <div
        role='status'
        className='flex items-center gap-3 text-sm text-[#A4A7AE]'
      >
        <LoaderCircle className='size-5 animate-spin text-[#6936F2]' />
        Opening Sociality...
      </div>
    </main>
  );
}
