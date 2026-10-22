'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, Home, LogOut, Plus, Search, UserRound } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import SocialityLogo from '@/components/branding/sociality-logo';

const links = [
  {
    href: '/feed',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/explore',
    label: 'Explore',
    icon: Compass,
  },
  {
    href: '/users/search',
    label: 'Search',
    icon: Search,
  },
  {
    href: '/posts/new',
    label: 'Create',
    icon: Plus,
  },
  {
    href: '/me',
    label: 'Profile',
    icon: UserRound,
  },
];

export default function SocialityNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const name = user?.name ?? 'Sociality member';
  const avatarUrl = user?.avatarUrl;

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className='fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-white/[0.08] bg-[#0A0D12] px-4 py-7 md:flex'>
        <div className='px-3'>
          <SocialityLogo href='/feed' width={145} height={30} />
        </div>

        <nav
          aria-label='Desktop navigation'
          className='mt-11 flex flex-1 flex-col gap-2'
        >
          {links.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 items-center gap-4 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] ${
                  active
                    ? 'bg-[#6936F2]/15 text-[#B99AFF]'
                    : 'text-[#A4A7AE] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className='size-5 shrink-0' />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className='border-t border-white/10 pt-5'>
          <Link
            href='/me'
            className='flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5'
          >
            <span className='relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2] text-sm font-semibold text-white'>
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={name}
                  fill
                  sizes='40px'
                  unoptimized
                  className='object-cover'
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </span>

            <span className='min-w-0'>
              <span className='block truncate text-sm font-semibold text-white'>
                {name}
              </span>
              <span className='block truncate text-xs text-[#A4A7AE]'>
                My account
              </span>
            </span>
          </Link>

          <button
            type='button'
            onClick={handleLogout}
            className='mt-2 flex min-h-11 w-full items-center gap-4 rounded-xl px-4 text-sm font-medium text-[#A4A7AE] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF]'
          >
            <LogOut className='size-5' />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className='sticky top-0 z-40 flex h-[64px] items-center justify-between border-b border-white/[0.08] bg-black/95 px-4 backdrop-blur-xl md:hidden'>
        <SocialityLogo href='/feed' width={125} height={27} />

        <div className='flex items-center gap-3'>
          <Link
            href='/users/search'
            aria-label='Search people'
            className='rounded-full p-2 text-[#D5D7DA] hover:bg-white/10'
          >
            <Search className='size-5' />
          </Link>

          <button
            type='button'
            onClick={handleLogout}
            aria-label='Log out'
            title='Log out'
            className='rounded-full p-2 text-[#D5D7DA] hover:bg-white/10'
          >
            <LogOut className='size-5' />
          </button>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav
        aria-label='Mobile navigation'
        className='fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#0A0D12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden'
      >
        {links.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const isCreate = item.href === '/posts/new';

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className='flex min-h-[64px] flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF]'
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full ${
                  isCreate
                    ? 'bg-[#6936F2] text-white'
                    : active
                      ? 'text-[#B99AFF]'
                      : 'text-[#A4A7AE]'
                }`}
              >
                <Icon className='size-5' />
              </span>

              <span
                className={`text-[10px] ${
                  active ? 'font-semibold text-[#B99AFF]' : 'text-[#A4A7AE]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
