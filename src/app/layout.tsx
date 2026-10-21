import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Providers from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Sociality',
    template: '%s | Sociality',
  },
  description:
    'Connect, share, and discover meaningful moments with Sociality.',
  applicationName: 'Sociality',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang='en' className='dark'>
      <body className='min-h-screen bg-background text-foreground antialiased'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
