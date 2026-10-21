'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Home,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import SocialityLogo from '@/components/branding/sociality-logo';
import PostCard, { type FeedPost } from '@/components/feed/post-card';
import { Button } from '@/components/ui/button';
import { getFeed } from '@/lib/api/feed';
import { parseFeedResponse } from '@/lib/api/feed-parser';

const PAGE_SIZE = 10;

const mobileNavigation = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/posts/new', label: 'Create', icon: Plus },
  { href: '/me', label: 'Profile', icon: UserRound },
];

function FeedSkeleton() {
  return (
    <div role='status' aria-label='Loading timeline' className='space-y-4'>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className='animate-pulse overflow-hidden rounded-xl border border-white/10 bg-[#0A0D12]'
        >
          <div className='flex items-center gap-3 p-4'>
            <div className='size-10 rounded-full bg-white/10' />
            <div className='space-y-2'>
              <div className='h-3 w-28 rounded bg-white/10' />
              <div className='h-3 w-20 rounded bg-white/10' />
            </div>
          </div>

          <div className='aspect-[4/3] bg-white/[0.04]' />

          <div className='space-y-3 p-4'>
            <div className='h-3 w-32 rounded bg-white/10' />
            <div className='h-3 w-4/5 rounded bg-white/10' />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', PAGE_SIZE],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await getFeed({
        page: pageParam,
        limit: PAGE_SIZE,
      });

      return parseFeedResponse(response);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasNextPage === false) {
        return undefined;
      }

      if (lastPage.hasNextPage === true) {
        return allPages.length + 1;
      }

      return lastPage.posts.length === PAGE_SIZE
        ? allPages.length + 1
        : undefined;
    },
  });

  const posts: FeedPost[] = Array.from(
    new Map(
      (feedQuery.data?.pages.flatMap((page) => page.posts) ?? []).map(
        (post) => [post.id, post] as const
      )
    ).values()
  );

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const avatarUrl = user?.avatarUrl;
  const displayName = user?.name ?? 'Sociality member';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className='min-h-screen bg-black font-sans text-white'>
      <header className='sticky top-0 z-40 border-b border-white/[0.08] bg-black/95 backdrop-blur-xl'>
        <div className='mx-auto flex h-[68px] max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6'>
          <SocialityLogo
            href='/feed'
            width={120}
            height={25}
            className='shrink-0'
          />

          <Link
            href='/search'
            aria-label='Search people and posts'
            className='hidden h-10 w-full max-w-[360px] items-center gap-3 rounded-full border border-white/[0.08] bg-[#181D27] px-4 text-[13px] text-[#A4A7AE] transition-colors hover:border-[#7F51F9]/40 hover:text-white sm:flex'
          >
            <Search className='size-[17px]' />
            <span>Search</span>
          </Link>

          <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
            <Link
              href='/search'
              aria-label='Search'
              className='flex size-9 items-center justify-center rounded-full text-[#D5D7DA] hover:bg-white/10 sm:hidden'
            >
              <Search className='size-5' />
            </Link>

            <Link
              href='/posts/new'
              aria-label='Create a post'
              className='flex size-9 items-center justify-center rounded-full text-[#D5D7DA] transition-colors hover:bg-white/10'
            >
              <Plus className='size-5' />
            </Link>

            <Link
              href='/me'
              aria-label='Open your profile'
              className='relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2] text-xs font-semibold text-white ring-2 ring-transparent transition-all hover:ring-[#7F51F9]'
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  sizes='36px'
                  unoptimized
                  className='object-cover'
                />
              ) : (
                initial
              )}
            </Link>

            <button
              type='button'
              onClick={handleLogout}
              aria-label='Log out'
              title='Log out'
              className='hidden size-9 items-center justify-center rounded-full text-[#A4A7AE] transition-colors hover:bg-white/10 hover:text-white sm:flex'
            >
              <LogOut className='size-[18px]' />
            </button>
          </div>
        </div>
      </header>

      <main className='mx-auto w-full max-w-[640px] px-4 pb-28 pt-7 sm:px-5 sm:pb-14 sm:pt-9'>
        <div className='mb-6 flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-[22px] leading-8 font-semibold tracking-[-0.035em] sm:text-[24px]'>
              Timeline
            </h1>
            <p className='mt-1 text-[12px] leading-5 text-[#A4A7AE]'>
              Discover moments from your community
            </p>
          </div>

          <button
            type='button'
            onClick={() => void feedQuery.refetch()}
            disabled={feedQuery.isFetching}
            aria-label='Refresh timeline'
            title='Refresh timeline'
            className='flex size-9 items-center justify-center rounded-full border border-white/10 text-[#A4A7AE] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50'
          >
            <RefreshCw
              className={`size-[17px] ${
                feedQuery.isFetching ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>

        <Link
          href='/posts/new'
          className='mb-6 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0A0D12] px-4 py-3 transition-colors hover:border-[#6936F2]/50'
        >
          <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-[#6936F2]/20 text-[#B9A1FF]'>
            <Plus className='size-[18px]' />
          </div>

          <span className='flex-1 text-[13px] text-[#A4A7AE]'>
            Share something with your community...
          </span>

          <span className='rounded-full bg-[#6936F2] px-3 py-1.5 text-[11px] font-semibold text-white'>
            Post
          </span>
        </Link>

        {feedQuery.isPending && <FeedSkeleton />}

        {feedQuery.isError && posts.length === 0 && (
          <section
            role='alert'
            className='rounded-xl border border-[#D9206E]/25 bg-[#0A0D12] px-6 py-10 text-center'
          >
            <AlertCircle className='mx-auto mb-4 size-9 text-[#D9206E]' />

            <h2 className='text-[17px] font-semibold'>
              Unable to load your timeline
            </h2>

            <p className='mx-auto mt-2 max-w-[380px] break-words text-[13px] leading-6 text-[#A4A7AE]'>
              {feedQuery.error instanceof Error
                ? feedQuery.error.message
                : 'Please try again.'}
            </p>

            <Button
              type='button'
              onClick={() => void feedQuery.refetch()}
              className='mt-5 rounded-full bg-[#6936F2] text-white hover:bg-[#7F51F9]'
            >
              Try again
            </Button>
          </section>
        )}

        {feedQuery.isSuccess && posts.length === 0 && (
          <section className='rounded-xl border border-white/[0.08] bg-[#0A0D12] px-6 py-12 text-center'>
            <div className='mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-[#6936F2]/15 text-[#A989FF]'>
              <Home className='size-7' />
            </div>

            <h2 className='text-[19px] font-semibold tracking-tight'>
              Your timeline is ready
            </h2>

            <p className='mx-auto mt-3 max-w-[330px] text-[13px] leading-6 text-[#A4A7AE]'>
              No posts are available yet. Find people to follow or share your
              first moment.
            </p>

            <div className='mt-6 flex flex-wrap justify-center gap-3'>
              <Link
                href='/search'
                className='inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10'
              >
                Find people
              </Link>

              <Link
                href='/posts/new'
                className='inline-flex h-10 items-center justify-center rounded-full bg-[#6936F2] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[#7F51F9]'
              >
                Create a post
              </Link>
            </div>
          </section>
        )}

        {posts.length > 0 && (
          <div className='space-y-4'>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {feedQuery.isFetchNextPageError && (
          <div
            role='alert'
            className='mt-6 text-center text-[12px] text-rose-400'
          >
            Could not load more posts. Please try again.
          </div>
        )}

        {feedQuery.hasNextPage && posts.length > 0 && (
          <div className='mt-8 flex justify-center'>
            <Button
              type='button'
              variant='outline'
              disabled={feedQuery.isFetchingNextPage}
              onClick={() => void feedQuery.fetchNextPage()}
              className='h-10 rounded-full border-white/15 bg-transparent px-6 text-[12px] text-white hover:bg-white/10 hover:text-white'
            >
              {feedQuery.isFetchingNextPage ? (
                <>
                  <LoaderCircle className='size-4 animate-spin' />
                  Loading...
                </>
              ) : (
                'Load more posts'
              )}
            </Button>
          </div>
        )}

        {feedQuery.isSuccess && !feedQuery.hasNextPage && posts.length > 0 && (
          <p className='mt-8 text-center text-[12px] text-[#717680]'>
            You&apos;re all caught up.
          </p>
        )}
      </main>

      <nav
        aria-label='Mobile navigation'
        className='fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#0A0D12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden'
      >
        {mobileNavigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={item.href === '/feed' ? 'page' : undefined}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-[10px] ${
                item.href === '/feed' ? 'text-[#A989FF]' : 'text-[#A4A7AE]'
              }`}
            >
              <Icon className='size-5' />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type='button'
          onClick={handleLogout}
          aria-label='Log out'
          className='flex min-h-[64px] flex-col items-center justify-center gap-1 text-[10px] text-[#A4A7AE]'
        >
          <LogOut className='size-5' />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
