import type { ReactNode } from 'react';
import Image from 'next/image';

import SocialityLogo from '@/components/branding/sociality-logo';

type AuthShellProps = {
  children: ReactNode;
  title: string;
  description?: string;
};

export default function AuthShell({
  children,
  title,
  description,
}: AuthShellProps) {
  const normalizedTitle =
    title.trim().toLowerCase() === 'welcome back' ? 'Welcome Back!' : title;

  return (
    <main className='relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10'
      >
        <Image
          src='/assets/figma/Element.png'
          alt=''
          fill
          priority
          sizes='100vw'
          className='object-cover object-bottom'
        />
      </div>

      <section
        aria-labelledby='auth-title'
        className='relative z-10 w-full max-w-[350px] rounded-[12px] border border-white/[0.08] bg-[#08080B]/95 px-5 py-7 shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:px-6'
      >
        <header className='mb-7 flex flex-col items-center text-center'>
          <SocialityLogo
            href='/login'
            width={116}
            height={23}
            className='mb-6'
          />

          <h1
            id='auth-title'
            className='font-sans text-[20px] leading-[28px] font-semibold tracking-[-0.035em] text-white'
          >
            {normalizedTitle}
          </h1>

          {description ? (
            <p className='mt-2 max-w-[280px] font-sans text-[12px] leading-[18px] text-[#A4A7AE]'>
              {description}
            </p>
          ) : null}
        </header>

        {children}
      </section>
    </main>
  );
}
