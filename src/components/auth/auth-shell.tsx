import type { ReactNode } from 'react';
import Image from 'next/image';

import SocialityLogo from '@/components/branding/sociality-logo';

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
  const displayTitle =
    title.trim().toLowerCase() === 'welcome back' ? 'Welcome Back!' : title;

  return (
    <main className='relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white'>
      {/* Original purple background element exported from Figma */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
      >
        <Image
          src='/assets/figma/Element.png'
          alt=''
          fill
          priority
          unoptimized
          sizes='100vw'
          className='object-cover object-bottom'
        />
      </div>

      {/* Centered authentication card */}
      <section className='relative z-10 w-full max-w-[350px] rounded-xl border border-white/10 bg-[#08080B]/95 px-6 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.35)] sm:px-7 sm:py-8'>
        <header className='mb-6 flex flex-col items-center text-center'>
          <div className='mb-4 flex items-center justify-center'>
            <SocialityLogo href='/login' width={72} height={21} />
          </div>

          <h1 className='text-xl font-bold tracking-tight text-white'>
            {displayTitle}
          </h1>

          {description && (
            <p className='mt-2 max-w-[260px] text-xs leading-5 text-zinc-400'>
              {description}
            </p>
          )}
        </header>

        {children}
      </section>
    </main>
  );
}
