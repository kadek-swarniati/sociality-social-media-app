import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sociality',
  description: 'Connect, share, and discover with Sociality.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className='min-h-screen bg-[#09090D] text-white antialiased'>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
