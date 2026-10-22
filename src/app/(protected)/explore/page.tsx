'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Compass,
  LoaderCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

import { api } from '@/lib/api/client';
import PostCard from '@/components/feed/post-card';

type JsonObject = Record<string, unknown>;

type ExplorePost = {
  id: number;
  caption: string;
  imageUrl: string | null;
  createdAt: string;
  author: {
    name: string;
    username: string;
    avatarUrl: string | null;
  };
  likesCount: number;
  commentsCount: number;
};

type ExplorePage = {
  items: ExplorePost[];
  hasNextPage: boolean;
};

const PAGE_SIZE = 12;

function obj(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  const result = Number(value);

  return Number.isFinite(result) ? result : 0;
}

function url(value: unknown): string | null {
  const result = str(value).trim();

  if (
    result.startsWith('https://') ||
    result.startsWith('http://') ||
    result.startsWith('/')
  ) {
    return result;
  }

  return null;
}

function parseExplore(value: unknown, page: number): ExplorePage {
  const root = obj(value);

  if (root.success === false) {
    throw new Error(str(root.message) || 'Unable to load public posts.');
  }

  const data = root.data ?? value;
  const payload = obj(data);

  const candidates: unknown[] = [
    data,
    payload.items,
    payload.posts,
    payload.results,
    root.items,
    root.posts,
  ];

  const rawItems = candidates.find(Array.isArray);

  if (!Array.isArray(rawItems)) {
    throw new Error('The public posts response format is not recognized.');
  }

  const items: ExplorePost[] = rawItems.map((entry: unknown) => {
    const post = obj(entry);
    const author = obj(post.author ?? post.user);

    const id = num(post.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('The API returned a post without a valid ID.');
    }

    return {
      id,

      caption: str(post.caption) || str(post.content),

      imageUrl: url(post.imageUrl) ?? url(post.image_url) ?? url(post.image),

      createdAt: str(post.createdAt) || str(post.created_at),

      author: {
        name: str(author.name) || str(author.username) || 'Sociality User',

        username: str(author.username),

        avatarUrl:
          url(author.avatarUrl) ?? url(author.avatar_url) ?? url(author.avatar),
      },

      likesCount: Math.max(
        0,
        num(post.likeCount ?? post.likesCount ?? post.likes_count)
      ),

      commentsCount: Math.max(
        0,
        num(post.commentCount ?? post.commentsCount ?? post.comments_count)
      ),
    };
  });

  const pagination = obj(payload.pagination ?? root.pagination);

  const totalPages = num(pagination.totalPages ?? payload.totalPages);

  const explicit = pagination.hasNextPage ?? pagination.hasNext;

  const hasNextPage =
    typeof explicit === 'boolean'
      ? explicit
      : totalPages > 0
        ? page < totalPages
        : items.length === PAGE_SIZE;

  return {
    items,
    hasNextPage,
  };
}

async function getExplorePage(page: number): Promise<ExplorePage> {
  const response = await api.get<unknown>('/posts', {
    params: {
      page,
      limit: PAGE_SIZE,
    },
  });

  return parseExplore(response.data, page);
}

export default function ExplorePage() {
  const query = useInfiniteQuery({
    queryKey: ['explore-posts'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getExplorePage(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
  });

  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  const uniquePosts = Array.from(
    new Map(posts.map((post) => [post.id, post])).values()
  );

  const isLoadingMore = query.isFetchingNextPage;

  const loadMoreFailed = query.isFetchNextPageError;

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[680px]'>
        <div className='mb-7 flex items-center justify-between gap-4'>
          <Link
            href='/feed'
            className='inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
          >
            <ArrowLeft className='size-4' />
            Feed
          </Link>

          <Link
            href='/users/search'
            className='inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10'
          >
            <Search className='size-4' />
            Find people
          </Link>
        </div>

        <header className='mb-8'>
          <div className='mb-3 flex items-center gap-3'>
            <span className='flex size-11 items-center justify-center rounded-2xl bg-[#6936F2]/20 text-[#B99AFF]'>
              <Compass className='size-6' />
            </span>

            <div>
              <h1 className='text-3xl font-bold tracking-tight'>Explore</h1>

              <p className='mt-1 text-sm text-[#A4A7AE]'>
                Discover posts beyond your following feed.
              </p>
            </div>
          </div>
        </header>

        {query.isPending ? (
          <div
            role='status'
            className='flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0A0D12] p-10 text-sm text-[#A4A7AE]'
          >
            <LoaderCircle className='size-5 animate-spin' />
            Loading public posts...
          </div>
        ) : query.isError && !query.data ? (
          <div
            role='alert'
            className='rounded-2xl border border-rose-500/20 bg-[#0A0D12] p-6'
          >
            <p className='text-sm text-rose-400'>
              {query.error instanceof Error
                ? query.error.message
                : 'Unable to load Explore.'}
            </p>

            <button
              type='button'
              onClick={() => void query.refetch()}
              className='mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6936F2] px-4 py-2 text-sm font-semibold'
            >
              <RefreshCw className='size-4' />
              Try again
            </button>
          </div>
        ) : uniquePosts.length === 0 ? (
          <div className='rounded-2xl border border-white/10 bg-[#0A0D12] p-10 text-center'>
            <Compass className='mx-auto mb-4 size-9 text-[#B99AFF]' />

            <h2 className='text-lg font-semibold'>Nothing to explore yet</h2>

            <p className='mt-2 text-sm text-[#A4A7AE]'>
              Public posts will appear here when available.
            </p>
          </div>
        ) : (
          <>
            <div className='space-y-5'>
              {uniquePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {loadMoreFailed && (
              <p
                role='alert'
                className='mt-6 text-center text-sm text-rose-400'
              >
                Could not load more posts. Please try again.
              </p>
            )}

            {query.hasNextPage && (
              <div className='mt-8 flex justify-center'>
                <button
                  type='button'
                  disabled={isLoadingMore}
                  onClick={() => void query.fetchNextPage()}
                  className='inline-flex items-center gap-2 rounded-full bg-[#6936F2] px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50'
                >
                  {isLoadingMore && (
                    <LoaderCircle className='size-4 animate-spin' />
                  )}

                  {isLoadingMore
                    ? 'Loading...'
                    : loadMoreFailed
                      ? 'Retry loading posts'
                      : 'Load more posts'}
                </button>
              </div>
            )}

            {!query.hasNextPage && (
              <p className='py-8 text-center text-xs text-[#A4A7AE]'>
                You&apos;re all caught up.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
