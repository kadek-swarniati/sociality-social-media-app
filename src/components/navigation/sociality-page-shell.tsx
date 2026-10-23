'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { useAuth } from '@/components/auth/auth-provider';
import SocialityNavigation from '@/components/navigation/sociality-navigation';
import SocialityLogo from '@/components/branding/sociality-logo';

export default function SocialityPageShell({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <div className='min-h-screen bg-black text-white'>
        <main className='mx-auto max-w-4xl px-4 py-12'>
          <p className='text-sm text-zinc-400'>Loading Sociality...</p>
        </main>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className='min-h-screen bg-black text-white'>
        <SocialityNavigation />

        <div className='min-h-screen pb-20 md:ml-[244px] md:pb-0'>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <header className='border-b border-white/10 bg-[#0A0D12]'>
        <div className='mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4'>
          <SocialityLogo href='/' width={135} height={29} />

          <div className='flex items-center gap-3'>
            <Link
              href='/users/search'
              className='text-sm text-zinc-300 hover:text-white'
            >
              Search
            </Link>

            <Link
              href='/login'
              className='rounded-full border border-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/10'
            >
              Log in
            </Link>

            <Link
              href='/register'
              className='rounded-full bg-[#6936F2] px-4 py-2 text-sm font-semibold hover:bg-[#7D55F5]'
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
