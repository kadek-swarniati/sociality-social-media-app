'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft,
  Compass,
  Heart,
  ImageOff,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

import { api } from '@/lib/api/client';

type JsonObject = Record<string, unknown>;

type ExplorePost = {
  id: number;
  caption: string;
  imageUrl: string | null;
  author: {
    name: string;
    username: string;
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
  if (value === null || value === undefined || value === '') {
    return 0;
  }

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
      author: {
        name: str(author.name) || str(author.username) || 'Sociality User',
        username: str(author.username),
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

  const totalPages = num(
    pagination.totalPages ?? pagination.total_pages ?? payload.totalPages
  );

  const explicit =
    pagination.hasNextPage ?? pagination.hasNext ?? payload.hasNextPage;

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

function ExploreTile({ post }: { post: ExplorePost }) {
  const description = post.caption || 'Photo';

  return (
    <Link
      href={`/posts/${post.id}`}
      aria-label={`View post by ${post.author.name}: ${description}`}
      className='group relative block aspect-square min-w-0 overflow-hidden bg-[#0A0D12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF]'
    >
      {post.imageUrl ? (
        // The image URL comes from the mentor API.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt={
            post.caption
              ? `Post by ${post.author.name}: ${post.caption}`
              : `Post by ${post.author.name}`
          }
          loading='lazy'
          decoding='async'
          className='block h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105'
        />
      ) : (
        <div className='flex h-full w-full flex-col items-center justify-center gap-2 bg-[#17141F] px-3 text-center'>
          <ImageOff aria-hidden='true' className='size-7 text-[#A4A7AE]' />

          <span className='line-clamp-3 text-xs text-[#A4A7AE]'>
            {post.caption || 'Image unavailable'}
          </span>
        </div>
      )}

      <div className='pointer-events-none absolute inset-0 flex items-center justify-center gap-4 bg-black/65 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:gap-5'>
        <span className='inline-flex items-center gap-1 text-xs font-semibold sm:text-sm'>
          <Heart aria-hidden='true' className='size-4 fill-white sm:size-5' />
          {post.likesCount}
        </span>

        <span className='inline-flex items-center gap-1 text-xs font-semibold sm:text-sm'>
          <MessageCircle aria-hidden='true' className='size-4 sm:size-5' />
          {post.commentsCount}
        </span>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const query = useInfiniteQuery({
    queryKey: ['explore-posts'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getExplorePage(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasNextPage ? allPages.length + 1 : undefined,
    staleTime: 30_000,
  });

  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  const uniquePosts = Array.from(
    new Map(posts.map((post) => [post.id, post] as const)).values()
  );

  const isInitialLoading = query.isPending;
  const isInitialError = query.isError && !query.data;
  const isEmpty =
    query.isSuccess && uniquePosts.length === 0 && !query.isFetching;
  const isLoadingMore = query.isFetchingNextPage;
  const loadMoreFailed = query.isFetchNextPageError;

  return (
    <main className='min-h-screen min-w-0 bg-black px-3 py-7 text-white sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-[1100px]'>
        <div className='mb-7 flex items-center justify-between gap-4'>
          <Link
            href='/feed'
            className='inline-flex items-center gap-2 text-sm text-[#A4A7AE] transition-colors hover:text-white'
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

        <header className='mb-7'>
          <div className='flex items-center gap-3'>
            <span className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#6936F2]/20 text-[#B99AFF]'>
              <Compass className='size-6' />
            </span>

            <div className='min-w-0'>
              <h1 className='text-3xl font-bold tracking-tight'>Explore</h1>

              <p className='mt-1 text-sm text-[#A4A7AE]'>
                Discover posts beyond your following feed.
              </p>
            </div>
          </div>
        </header>

        {isInitialLoading && (
          <div
            role='status'
            aria-label='Loading public posts'
            className='grid grid-cols-3 gap-1 sm:gap-2'
          >
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div
                key={index}
                className='aspect-square animate-pulse bg-[#17141F]'
              />
            ))}
          </div>
        )}

        {isInitialError && (
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
              className='mt-4 inline-flex items-center gap-2 rounded-lg bg-[#6936F2] px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF]'
            >
              <RefreshCw className='size-4' />
              Try again
            </button>
          </div>
        )}

        {isEmpty && (
          <div className='rounded-2xl border border-white/10 bg-[#0A0D12] p-10 text-center'>
            <Compass className='mx-auto mb-4 size-9 text-[#B99AFF]' />

            <h2 className='text-lg font-semibold'>Nothing to explore yet</h2>

            <p className='mt-2 text-sm text-[#A4A7AE]'>
              Public posts will appear here when available.
            </p>
          </div>
        )}

        {uniquePosts.length > 0 && (
          <>
            <section
              aria-label='Explore posts'
              className='grid grid-cols-3 gap-1 sm:gap-2'
            >
              {uniquePosts.map((post) => (
                <ExploreTile key={post.id} post={post} />
              ))}
            </section>

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
                  disabled={isLoadingMore || query.isRefetching}
                  onClick={() => void query.fetchNextPage()}
                  className='inline-flex items-center gap-2 rounded-full bg-[#6936F2] px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:opacity-50'
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
