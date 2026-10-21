import { Suspense, type ReactNode } from 'react';

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className='flex min-h-screen items-center justify-center bg-[#09090D] text-zinc-400'>
          Loading Sociality...
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
