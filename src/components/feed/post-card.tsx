'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Heart, LoaderCircle, MessageCircle } from 'lucide-react';

import { getApiErrorMessage } from '@/lib/api/client';
import { likePost, unlikePost, savePost, unsavePost } from '@/lib/api/posts';
import {
  getSocialActionStatus,
  type SocialActionStatus,
} from '@/lib/api/social-actions';

dayjs.extend(relativeTime);

export type FeedPost = {
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

type PostCardProps = {
  post: FeedPost;
};

const STATUS_QUERY_KEY = ['social-action-status'];

export default function PostCard({ post }: PostCardProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number | null>(
    null
  );

  const statusQuery = useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: getSocialActionStatus,
    staleTime: 30_000,
    retry: 1,
  });

  const status = statusQuery.data;

  const isLiked = status?.likedPostIds.has(post.id) ?? false;

  const isSaved = status?.savedPostIds.has(post.id) ?? false;

  function updateCachedStatus(kind: 'like' | 'save', enabled: boolean) {
    queryClient.setQueryData<SocialActionStatus>(
      STATUS_QUERY_KEY,
      (previous) => {
        if (!previous) return previous;

        const likedPostIds = new Set(previous.likedPostIds);
        const savedPostIds = new Set(previous.savedPostIds);

        const target = kind === 'like' ? likedPostIds : savedPostIds;

        if (enabled) {
          target.add(post.id);
        } else {
          target.delete(post.id);
        }

        return { likedPostIds, savedPostIds };
      }
    );
  }

  const likeMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
      }
    },

    onMutate: async (currentlyLiked) => {
      await queryClient.cancelQueries({
        queryKey: STATUS_QUERY_KEY,
      });

      const previous =
        queryClient.getQueryData<SocialActionStatus>(STATUS_QUERY_KEY);

      updateCachedStatus('like', !currentlyLiked);

      setOptimisticLikeCount(
        Math.max(0, post.likesCount + (currentlyLiked ? -1 : 1))
      );

      return { previous };
    },

    onError: (error, _currentlyLiked, context) => {
      if (context?.previous) {
        queryClient.setQueryData(STATUS_QUERY_KEY, context.previous);
      }

      setOptimisticLikeCount(null);
      setActionError(getApiErrorMessage(error));
    },

    onSuccess: () => {
      setActionError('');
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: STATUS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: ['feed'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['post', post.id],
        }),
      ]);

      setOptimisticLikeCount(null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (currentlySaved: boolean) => {
      if (currentlySaved) {
        await unsavePost(post.id);
      } else {
        await savePost(post.id);
      }
    },

    onMutate: async (currentlySaved) => {
      await queryClient.cancelQueries({
        queryKey: STATUS_QUERY_KEY,
      });

      const previous =
        queryClient.getQueryData<SocialActionStatus>(STATUS_QUERY_KEY);

      updateCachedStatus('save', !currentlySaved);

      return { previous };
    },

    onError: (error, _currentlySaved, context) => {
      if (context?.previous) {
        queryClient.setQueryData(STATUS_QUERY_KEY, context.previous);
      }

      setActionError(getApiErrorMessage(error));
    },

    onSuccess: () => {
      setActionError('');
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: STATUS_QUERY_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: ['me'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['post', post.id],
        }),
      ]);
    },
  });

  const initial = post.author.name.charAt(0).toUpperCase() || '?';

  const validDate = !!post.createdAt && dayjs(post.createdAt).isValid();

  const profileHref = post.author.username
    ? `/profile/${encodeURIComponent(post.author.username)}`
    : `/posts/${post.id}`;

  const actionsReady = statusQuery.isSuccess;

  return (
    <article className='overflow-hidden rounded-xl border border-white/[0.08] bg-[#0A0D12] font-sans'>
      <header className='flex items-center gap-3 px-4 py-3.5'>
        <Link
          href={profileHref}
          className='group flex min-w-0 flex-1 items-center gap-3'
        >
          <div className='relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2] text-sm font-semibold text-white'>
            {post.author.avatarUrl ? (
              <Image
                src={post.author.avatarUrl}
                alt={`${post.author.name}'s avatar`}
                fill
                sizes='40px'
                unoptimized
                className='object-cover'
              />
            ) : (
              initial
            )}
          </div>

          <div className='min-w-0'>
            <p className='truncate text-[13px] leading-5 font-semibold text-white group-hover:text-[#B9A1FF]'>
              {post.author.name}
            </p>

            <p className='truncate text-[11px] leading-4 text-[#A4A7AE]'>
              @{post.author.username}
            </p>
          </div>
        </Link>

        {validDate && (
          <time
            dateTime={post.createdAt}
            title={dayjs(post.createdAt).format('DD MMM YYYY, HH:mm')}
            className='shrink-0 text-[11px] text-[#717680]'
          >
            {dayjs(post.createdAt).fromNow()}
          </time>
        )}
      </header>

      {post.imageUrl && (
        <Link
          href={`/posts/${post.id}`}
          aria-label={`View post by ${post.author.name}`}
          className='relative block aspect-[4/3] w-full overflow-hidden bg-[#181D27]'
        >
          <Image
            src={post.imageUrl}
            alt={post.caption || `Post by ${post.author.name}`}
            fill
            sizes='(max-width: 640px) 100vw, 600px'
            unoptimized
            className='object-cover transition-transform duration-300 hover:scale-[1.015]'
          />
        </Link>
      )}

      <div className='space-y-3 px-4 py-3.5'>
        <div className='flex items-center gap-5 text-[#A4A7AE]'>
          <button
            type='button'
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
            aria-pressed={isLiked}
            disabled={!actionsReady || likeMutation.isPending}
            onClick={() => {
              if (!actionsReady) return;

              setActionError('');
              likeMutation.mutate(isLiked);
            }}
            className='flex items-center gap-1.5 transition-colors hover:text-[#D9206E] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {likeMutation.isPending ? (
              <LoaderCircle className='size-[19px] animate-spin' />
            ) : (
              <Heart
                className={`size-[19px] ${
                  isLiked ? 'fill-[#D9206E] text-[#D9206E]' : ''
                }`}
              />
            )}

            <span className='text-[12px]'>
              {optimisticLikeCount ?? post.likesCount}
            </span>
          </button>

          <Link
            href={`/posts/${post.id}#comments`}
            aria-label={`View ${post.commentsCount} comments`}
            className='flex items-center gap-1.5 transition-colors hover:text-[#B9A1FF]'
          >
            <MessageCircle className='size-[19px]' />
            <span className='text-[12px]'>{post.commentsCount}</span>
          </Link>

          <button
            type='button'
            aria-label={isSaved ? 'Unsave post' : 'Save post'}
            aria-pressed={isSaved}
            disabled={!actionsReady || saveMutation.isPending}
            onClick={() => {
              if (!actionsReady) return;

              setActionError('');
              saveMutation.mutate(isSaved);
            }}
            className='ml-auto transition-colors hover:text-[#B9A1FF] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {saveMutation.isPending ? (
              <LoaderCircle className='size-[19px] animate-spin' />
            ) : (
              <Bookmark
                className={`size-[19px] ${
                  isSaved ? 'fill-[#6936F2] text-[#B9A1FF]' : ''
                }`}
              />
            )}
          </button>
        </div>

        {statusQuery.isError && (
          <div role='alert' className='text-[12px] leading-5 text-rose-400'>
            <p>Could not load your Like and Save status.</p>

            <button
              type='button'
              onClick={() => void statusQuery.refetch()}
              className='mt-1 font-semibold text-[#B9A1FF]'
            >
              Retry
            </button>
          </div>
        )}

        {actionError && (
          <p role='alert' className='text-[12px] text-rose-400'>
            {actionError}
          </p>
        )}

        {post.caption && (
          <p className='whitespace-pre-wrap break-words text-[13px] leading-[21px] text-[#D5D7DA]'>
            <Link
              href={profileHref}
              className='mr-2 font-semibold text-white hover:text-[#B9A1FF]'
            >
              {post.author.username || post.author.name}
            </Link>
            {post.caption}
          </p>
        )}

        <Link
          href={`/posts/${post.id}`}
          className='inline-block text-[11px] text-[#717680] transition-colors hover:text-[#B9A1FF]'
        >
          View post
        </Link>
      </div>
    </article>
  );
}
