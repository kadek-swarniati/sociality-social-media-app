import Link from 'next/link';
import type { ReactNode } from 'react';
import { Heart, MessageCircle, UsersRound } from 'lucide-react';

type AuthShellProps = {
  children: ReactNode;
  title: string;
  description: string;
};

export default function AuthShell({
  children,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className='grid min-h-screen bg-[#09090D] text-white lg:grid-cols-2'>
      <section className='flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16'>
        <header className='mx-auto w-full max-w-md'>
          <Link
            href='/'
            className='inline-flex items-center gap-3 text-2xl font-bold tracking-tight'
          >
            <span className='flex size-10 items-center justify-center rounded-xl bg-[#6D28D9]'>
              <Heart className='size-5' fill='currentColor' />
            </span>
            Sociality
          </Link>
        </header>

        <div className='mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12'>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            {title}
          </h1>

          <p className='mt-3 mb-9 text-sm leading-7 text-zinc-400 sm:text-base'>
            {description}
          </p>

          {children}
        </div>

        <footer className='mx-auto w-full max-w-md text-center text-xs text-zinc-500'>
          Sociality · Connect, share, discover
        </footer>
      </section>

      <aside className='relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#5613A3] via-[#522BC8] to-[#211047] lg:flex'>
        <div className='absolute -top-32 -right-32 size-[480px] rounded-full border border-white/10' />
        <div className='absolute -bottom-40 -left-40 size-[600px] rounded-full border border-white/10' />

        <div className='relative z-10 flex w-full flex-col items-center justify-center px-12 text-center'>
          <div className='relative mb-12 flex size-60 items-center justify-center rounded-[48px] border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl'>
            <Heart
              className='size-28 text-white'
              fill='currentColor'
              strokeWidth={1}
            />

            <div className='absolute -right-8 top-4 flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/20 backdrop-blur-xl'>
              <MessageCircle className='size-8' />
            </div>

            <div className='absolute -bottom-6 -left-8 flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/20 backdrop-blur-xl'>
              <UsersRound className='size-8' />
            </div>
          </div>

          <h2 className='max-w-md text-4xl font-bold leading-tight'>
            Your world.
            <br />
            Your people.
            <br />
            Your stories.
          </h2>

          <p className='mt-5 max-w-sm leading-8 text-purple-100/80'>
            Share meaningful moments and stay connected with your community.
          </p>
        </div>
      </aside>
    </main>
  );
}
