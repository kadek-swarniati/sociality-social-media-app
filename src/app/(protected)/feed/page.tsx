'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Home,
  LoaderCircle,
  LogOut,
  PlusSquare,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import PostCard, { type FeedPost } from '@/components/feed/post-card';
import { Button } from '@/components/ui/button';
import { getFeed } from '@/lib/api/feed';
import { parseFeedResponse } from '@/lib/api/feed-parser';

const PAGE_SIZE = 10;

const navigation = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/posts/new', label: 'Create Post', icon: PlusSquare },
  { href: '/me', label: 'Profile', icon: UserRound },
];

export default function FeedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed'],
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

      if (lastPage.posts.length < PAGE_SIZE) {
        return undefined;
      }

      return allPages.length + 1;
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

  return (
    <div className='min-h-screen bg-[#0D0B12] text-white'>
      <div className='mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pb-24 pt-6 md:grid-cols-[220px_minmax(0,1fr)] md:px-8 md:pb-10 lg:grid-cols-[240px_minmax(0,640px)_260px]'>
        <aside className='hidden md:block'>
          <div className='sticky top-8 space-y-10'>
            <Link
              href='/feed'
              className='flex items-center gap-3 text-2xl font-bold'
            >
              <Sparkles className='size-8 text-purple-400' />
              Sociality
            </Link>

            <nav aria-label='Main navigation' className='space-y-2'>
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.href === '/feed' ? 'page' : undefined}
                    className={`flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      item.href === '/feed'
                        ? 'bg-purple-600/20 text-purple-300'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className='size-5' />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Button
              variant='outline'
              onClick={handleLogout}
              className='w-full justify-start border-white/10 bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white'
            >
              <LogOut className='mr-3 size-4' />
              Logout
            </Button>
          </div>
        </aside>

        <main className='min-w-0'>
          <header className='mb-6 flex items-center justify-between border-b border-white/10 pb-5'>
            <div>
              <div className='mb-2 flex items-center gap-2 md:hidden'>
                <Sparkles className='size-6 text-purple-400' />
                <span className='font-bold'>Sociality</span>
              </div>
              <h1 className='text-2xl font-bold'>Home Feed</h1>
              <p className='mt-1 text-sm text-zinc-400'>
                Moments from you and people you follow
              </p>
            </div>

            <Link
              href='/posts/new'
              className='rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-600'
            >
              Create
            </Link>
          </header>

          {feedQuery.isPending && (
            <div role='status' className='space-y-5' aria-label='Loading feed'>
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className='animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[#15131B]'
                >
                  <div className='flex items-center gap-3 p-4'>
                    <div className='size-11 rounded-full bg-white/10' />
                    <div className='space-y-2'>
                      <div className='h-3 w-32 rounded bg-white/10' />
                      <div className='h-3 w-20 rounded bg-white/10' />
                    </div>
                  </div>
                  <div className='aspect-[4/3] bg-white/5' />
                  <div className='space-y-3 p-4'>
                    <div className='h-3 w-4/5 rounded bg-white/10' />
                    <div className='h-3 w-2/3 rounded bg-white/10' />
                  </div>
                </div>
              ))}
            </div>
          )}

          {feedQuery.isError && posts.length === 0 && (
            <div
              role='alert'
              className='rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center'
            >
              <AlertCircle className='mx-auto mb-4 size-8 text-red-400' />
              <h2 className='font-semibold'>Unable to load your feed</h2>
              <p className='mt-2 break-words text-sm text-zinc-400'>
                {feedQuery.error instanceof Error
                  ? feedQuery.error.message
                  : 'Please try again.'}
              </p>
              <Button className='mt-5' onClick={() => void feedQuery.refetch()}>
                Try again
              </Button>
            </div>
          )}

          {feedQuery.isSuccess && posts.length === 0 && (
            <div className='rounded-2xl border border-white/10 bg-[#15131B] p-10 text-center'>
              <Sparkles className='mx-auto mb-4 size-10 text-purple-400' />
              <h2 className='text-xl font-semibold'>Your feed is ready</h2>
              <p className='mt-3 text-sm leading-6 text-zinc-400'>
                No posts are available yet. Follow other members or share your
                first moment.
              </p>
              <div className='mt-6 flex flex-wrap justify-center gap-3'>
                <Button
                  variant='outline'
                  onClick={() => router.push('/search')}
                >
                  Find people
                </Button>
                <Button onClick={() => router.push('/posts/new')}>
                  Create a post
                </Button>
              </div>
            </div>
          )}

          {posts.length > 0 && (
            <div className='space-y-5'>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {feedQuery.isFetchNextPageError && (
            <p role='alert' className='mt-6 text-center text-sm text-red-400'>
              Could not load more posts.
            </p>
          )}

          {feedQuery.hasNextPage && posts.length > 0 && (
            <div className='mt-8 text-center'>
              <Button
                variant='outline'
                disabled={feedQuery.isFetchingNextPage}
                onClick={() => void feedQuery.fetchNextPage()}
                className='border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white'
              >
                {feedQuery.isFetchingNextPage ? (
                  <>
                    <LoaderCircle className='mr-2 size-4 animate-spin' />
                    Loading...
                  </>
                ) : (
                  'Load more posts'
                )}
              </Button>
            </div>
          )}

          {feedQuery.isSuccess &&
            !feedQuery.hasNextPage &&
            posts.length > 0 && (
              <p className='mt-8 text-center text-xs text-zinc-500'>
                You&apos;re all caught up.
              </p>
            )}
        </main>

        <aside className='hidden lg:block'>
          <div className='sticky top-8 rounded-2xl border border-white/10 bg-[#15131B] p-5'>
            <p className='text-xs font-semibold uppercase tracking-widest text-zinc-500'>
              Your account
            </p>
            <p className='mt-4 font-semibold'>
              {user?.name ?? 'Sociality member'}
            </p>
            <p className='mt-1 break-all text-sm text-zinc-400'>
              @{user?.username ?? ''}
            </p>
            <p className='mt-5 text-sm leading-6 text-zinc-400'>
              Connect, discover, and share moments with your community.
            </p>
          </div>
        </aside>
      </div>

      <nav
        aria-label='Mobile navigation'
        className='fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-white/10 bg-[#15131B]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden'
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={item.href === '/feed' ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                item.href === '/feed' ? 'text-purple-400' : 'text-zinc-400'
              }`}
            >
              <Icon className='size-5' />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
