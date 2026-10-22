import type { ReactNode } from 'react';

import AuthGuard from '@/components/auth/auth-guard';
import SocialityNavigation from '@/components/navigation/sociality-navigation';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className='min-h-screen bg-black text-white'>
        <SocialityNavigation />

        <div className='min-h-screen pb-20 md:ml-[244px] md:pb-0'>
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
