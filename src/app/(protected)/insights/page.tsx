'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Heart,
  LoaderCircle,
  MessageCircle,
  TrendingUp,
} from 'lucide-react';

import { getMyPostList, type AccountPost } from '@/lib/api/account';
import { getApiErrorMessage } from '@/lib/api/client';

const PAGE_SIZE = 20;

type SortMode = 'engagement' | 'likes' | 'comments';

function count(value: number | null): number {
  return value ?? 0;
}

function interactions(post: AccountPost): number {
  return count(post.likesCount) + count(post.commentsCount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Heart;
}) {
  return (
    <div className='rounded-2xl border border-white/10 bg-[#0A0D12] p-5'>
      <div className='flex items-center justify-between'>
        <p className='text-sm text-[#A4A7AE]'>{label}</p>

        <Icon className='size-5 text-[#A989FF]' />
      </div>

      <p className='mt-4 text-3xl font-semibold text-white'>{value}</p>

      <p className='mt-2 text-xs text-[#717680]'>{description}</p>
    </div>
  );
}

export default function InsightsPage() {
  const [sort, setSort] = useState<SortMode>('engagement');

  const postsQuery = useInfiniteQuery({
    queryKey: ['my-post-list', 'posts'],
    initialPageParam: 1,

    queryFn: ({ pageParam }) => getMyPostList('posts', pageParam, PAGE_SIZE),

    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
  });

  const posts = Array.from(
    new Map(
      (postsQuery.data?.pages.flatMap((page) => page.items) ?? []).map(
        (post) => [post.id, post] as const
      )
    ).values()
  );

  const totalLikes = posts.reduce(
    (sum, post) => sum + count(post.likesCount),
    0
  );

  const totalComments = posts.reduce(
    (sum, post) => sum + count(post.commentsCount),
    0
  );

  const totalInteractions = totalLikes + totalComments;

  const averageInteractions =
    posts.length > 0 ? totalInteractions / posts.length : 0;

  const sortedPosts = [...posts].sort((a, b) => {
    if (sort === 'likes') {
      return count(b.likesCount) - count(a.likesCount);
    }

    if (sort === 'comments') {
      return count(b.commentsCount) - count(a.commentsCount);
    }

    return interactions(b) - interactions(a);
  });

  const maxInteractions = Math.max(1, ...posts.map(interactions));

  const hasIncompleteCounts = posts.some(
    (post) => post.likesCount === null || post.commentsCount === null
  );

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[960px]'>
        <Link
          href='/me'
          className='mb-7 inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
        >
          <ArrowLeft className='size-4' />
          My Profile
        </Link>

        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-[#6936F2]/40 bg-[#6936F2]/10 px-3 py-1 text-xs font-semibold text-[#B99AFF]'>
              <Activity className='size-3.5' />
              Sociality Intelligence
            </div>

            <h1 className='text-3xl font-semibold tracking-tight'>
              Creator Insights
            </h1>

            <p className='mt-3 max-w-[640px] text-sm leading-6 text-[#A4A7AE]'>
              Understand your content performance using real likes and comments
              from Sociality.
            </p>
          </div>

          <Link
            href='/posts/new'
            className='inline-flex items-center gap-2 rounded-full bg-[#6936F2] px-5 py-3 text-sm font-semibold hover:bg-[#7F51F9]'
          >
            Create Post
            <ArrowUpRight className='size-4' />
          </Link>
        </div>

        {postsQuery.isPending ? (
          <div
            role='status'
            className='mt-10 flex items-center gap-3 text-sm text-[#A4A7AE]'
          >
            <LoaderCircle className='size-5 animate-spin' />
            Loading your insights...
          </div>
        ) : postsQuery.isError && posts.length === 0 ? (
          <div
            role='alert'
            className='mt-8 rounded-2xl border border-white/10 bg-[#0A0D12] p-6'
          >
            <p className='text-sm text-rose-400'>
              {getApiErrorMessage(postsQuery.error)}
            </p>

            <button
              type='button'
              onClick={() => void postsQuery.refetch()}
              className='mt-4 text-sm font-semibold text-[#B99AFF]'
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <section aria-label='Personal insights' className='mt-8'>
              <div className='mb-4 flex items-center gap-2'>
                <BarChart3 className='size-5 text-[#A989FF]' />

                <h2 className='text-lg font-semibold'>Personal Insights</h2>
              </div>

              <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                <MetricCard
                  label='Posts analyzed'
                  value={formatNumber(posts.length)}
                  description='Posts loaded from your account'
                  icon={BarChart3}
                />

                <MetricCard
                  label='Likes received'
                  value={formatNumber(totalLikes)}
                  description='Across loaded posts'
                  icon={Heart}
                />

                <MetricCard
                  label='Comments received'
                  value={formatNumber(totalComments)}
                  description='Across loaded posts'
                  icon={MessageCircle}
                />

                <MetricCard
                  label='Avg. interactions'
                  value={averageInteractions.toFixed(1)}
                  description='Likes + comments per post'
                  icon={TrendingUp}
                />
              </div>

              {hasIncompleteCounts && (
                <p className='mt-4 text-xs text-amber-300'>
                  Some posts have unavailable interaction counts. Metrics may be
                  incomplete.
                </p>
              )}

              {postsQuery.hasNextPage && (
                <p className='mt-4 text-xs text-[#A4A7AE]'>
                  More posts are available. Load them below to expand this
                  analysis.
                </p>
              )}
            </section>

            <section aria-label='Creator performance' className='mt-10'>
              <div className='flex flex-wrap items-center justify-between gap-4'>
                <div>
                  <div className='flex items-center gap-2'>
                    <TrendingUp className='size-5 text-[#A989FF]' />

                    <h2 className='text-lg font-semibold'>
                      Creator Performance
                    </h2>
                  </div>

                  <p className='mt-2 text-xs text-[#A4A7AE]'>
                    Rank your posts by observable engagement.
                  </p>
                </div>

                <label className='flex items-center gap-3 text-xs text-[#A4A7AE]'>
                  Sort by
                  <select
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as SortMode)
                    }
                    className='rounded-xl border border-white/15 bg-[#181D27] px-3 py-2 text-sm text-white outline-none focus:border-[#6936F2]'
                  >
                    <option value='engagement'>Total interactions</option>

                    <option value='likes'>Likes</option>

                    <option value='comments'>Comments</option>
                  </select>
                </label>
              </div>

              {sortedPosts.length === 0 ? (
                <div className='mt-5 rounded-2xl border border-white/10 bg-[#0A0D12] px-6 py-12 text-center'>
                  <BarChart3 className='mx-auto size-9 text-[#A989FF]' />

                  <p className='mt-4 text-sm text-[#A4A7AE]'>
                    Create your first post to unlock insights.
                  </p>
                </div>
              ) : (
                <div className='mt-5 space-y-3'>
                  {sortedPosts.map((post, index) => {
                    const engagement = interactions(post);

                    const barWidth = (engagement / maxInteractions) * 100;

                    return (
                      <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className='block rounded-2xl border border-white/10 bg-[#0A0D12] p-5 transition-colors hover:border-[#6936F2]/50'
                      >
                        <div className='flex items-start gap-4'>
                          <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#6936F2]/15 text-sm font-semibold text-[#B99AFF]'>
                            {index + 1}
                          </span>

                          <div className='min-w-0 flex-1'>
                            <p className='line-clamp-2 text-sm font-medium'>
                              {post.caption || `Post #${post.id}`}
                            </p>

                            <div className='mt-3 flex flex-wrap gap-4 text-xs text-[#A4A7AE]'>
                              <span className='inline-flex items-center gap-1'>
                                <Heart className='size-3.5' />
                                {count(post.likesCount)}
                              </span>

                              <span className='inline-flex items-center gap-1'>
                                <MessageCircle className='size-3.5' />
                                {count(post.commentsCount)}
                              </span>

                              <span className='font-semibold text-[#B99AFF]'>
                                {engagement} interactions
                              </span>
                            </div>

                            <div
                              className='mt-4 h-2 overflow-hidden rounded-full bg-[#252B37]'
                              role='img'
                              aria-label={`${engagement} interactions`}
                            >
                              <div
                                className='h-full rounded-full bg-[#6936F2]'
                                style={{
                                  width: `${barWidth}%`,
                                }}
                              />
                            </div>
                          </div>

                          <ArrowUpRight className='size-4 shrink-0 text-[#717680]' />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {postsQuery.isFetchNextPageError && (
              <p
                role='alert'
                className='mt-6 text-center text-sm text-rose-400'
              >
                Could not load more posts. Please retry.
              </p>
            )}

            {postsQuery.hasNextPage && (
              <button
                type='button'
                disabled={postsQuery.isFetchingNextPage}
                onClick={() => void postsQuery.fetchNextPage()}
                className='mt-6 w-full rounded-full border border-white/15 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50'
              >
                {postsQuery.isFetchingNextPage
                  ? 'Loading...'
                  : postsQuery.isFetchNextPageError
                    ? 'Retry loading posts'
                    : 'Load more posts'}
              </button>
            )}

            <p className='mt-8 text-xs leading-5 text-[#717680]'>
              Methodology: interactions = likes + comments. Ranking and summary
              metrics use only posts currently loaded from the Sociality API.
              This is not a reach, impressions, or engagement-rate estimate.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
