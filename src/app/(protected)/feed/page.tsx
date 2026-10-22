'use client';

import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle, Home, LoaderCircle, Plus, RefreshCw } from 'lucide-react';

import PostCard, { type FeedPost } from '@/components/feed/post-card';

import { Button } from '@/components/ui/button';
import { getFeed } from '@/lib/api/feed';
import { parseFeedResponse } from '@/lib/api/feed-parser';

const PAGE_SIZE = 10;

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

    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const posts: FeedPost[] = Array.from(
    new Map(
      (feedQuery.data?.pages.flatMap((page) => page.posts) ?? []).map(
        (post) => [post.id, post] as const
      )
    ).values()
  );

  const isInitialLoading = feedQuery.isPending;
  const isInitialError = feedQuery.isError && posts.length === 0;

  const isEmpty =
    feedQuery.isSuccess && posts.length === 0 && !feedQuery.isFetching;

  const isLoadingMore = feedQuery.isFetchingNextPage;

  const loadMoreFailed = feedQuery.isFetchNextPageError;

  return (
    <main className='mx-auto w-full max-w-[640px] px-4 pb-14 pt-7 sm:px-5 sm:pt-9'>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-[22px] font-semibold leading-8 tracking-[-0.035em] sm:text-[24px]'>
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
          className='flex size-9 items-center justify-center rounded-full border border-white/10 text-[#A4A7AE] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:opacity-50'
        >
          <RefreshCw
            className={`size-[17px] ${
              feedQuery.isFetching && !feedQuery.isFetchingNextPage
                ? 'animate-spin'
                : ''
            }`}
          />
        </button>
      </div>

      <Link
        href='/posts/new'
        className='mb-6 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0A0D12] px-4 py-3 transition-colors hover:border-[#6936F2]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF]'
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

      {isInitialLoading && <FeedSkeleton />}

      {isInitialError && (
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

      {isEmpty && (
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
              href='/users/search'
              className='inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10'
            >
              Find people
            </Link>

            <Link
              href='/explore'
              className='inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-5 text-[12px] font-semibold text-white transition-colors hover:bg-white/10'
            >
              Explore posts
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

      {loadMoreFailed && (
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
            disabled={isLoadingMore || feedQuery.isRefetching}
            onClick={() => void feedQuery.fetchNextPage()}
            className='h-10 rounded-full border-white/15 bg-transparent px-6 text-[12px] text-white hover:bg-white/10 hover:text-white'
          >
            {isLoadingMore ? (
              <>
                <LoaderCircle className='size-4 animate-spin' />
                Loading...
              </>
            ) : loadMoreFailed ? (
              'Retry loading posts'
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
  );
}
