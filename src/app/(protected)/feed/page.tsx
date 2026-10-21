'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Sparkles } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';

export default function FeedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <main className='min-h-screen bg-[#09090D] px-5 py-12 text-white'>
      <div className='mx-auto max-w-3xl'>
        <header className='mb-12 flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <Sparkles className='size-7 text-purple-400' />
            <span className='text-2xl font-bold tracking-tight'>Sociality</span>
          </div>

          <Button
            type='button'
            variant='outline'
            onClick={handleLogout}
            className='border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white'
          >
            <LogOut className='mr-2 size-4' />
            Logout
          </Button>
        </header>

        <section className='rounded-3xl border border-white/10 bg-white/5 p-8'>
          <p className='mb-3 text-sm font-medium text-purple-400'>
            Authentication checkpoint
          </p>

          <h1 className='text-3xl font-bold'>
            Welcome, {user?.name ?? 'Sociality member'}!
          </h1>

          <p className='mt-4 text-zinc-400'>
            Your login session is active. This page is protected and can only be
            accessed by authenticated users.
          </p>

          <div className='mt-8 rounded-2xl border border-white/10 bg-black/20 p-5'>
            <p className='text-xs uppercase tracking-widest text-zinc-500'>
              Signed-in account
            </p>

            <p className='mt-3 font-semibold'>{user?.name ?? 'Loading user'}</p>

            <p className='mt-1 text-sm text-zinc-400'>
              @{user?.username ?? 'unknown'}
            </p>
          </div>

          <p className='mt-6 text-sm text-zinc-500'>
            The API-powered timeline and Figma navigation will replace this
            checkpoint in the next implementation stage.
          </p>
        </section>
      </div>
    </main>
  );
}
