'use client';

import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Heart, MessageCircle, Bookmark } from 'lucide-react';

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

export default function PostCard({ post }: PostCardProps) {
  const initial = post.author.name.charAt(0).toUpperCase();

  return (
    <article className='overflow-hidden rounded-2xl border border-white/10 bg-[#15131B]'>
      <div className='flex items-center gap-3 p-4'>
        <Link
          href={`/users/${encodeURIComponent(post.author.username)}`}
          className='flex min-w-0 items-center gap-3'
        >
          <div className='relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-800 text-sm font-semibold text-white'>
            {post.author.avatarUrl ? (
              <Image
                src={post.author.avatarUrl}
                alt={`${post.author.name}'s avatar`}
                fill
                sizes='44px'
                unoptimized
                className='object-cover'
              />
            ) : (
              initial
            )}
          </div>

          <div className='min-w-0'>
            <p className='truncate font-semibold text-white'>
              {post.author.name}
            </p>
            <p className='truncate text-xs text-zinc-400'>
              @{post.author.username}
            </p>
          </div>
        </Link>

        <time
          dateTime={post.createdAt}
          className='ml-auto shrink-0 text-xs text-zinc-500'
        >
          {dayjs(post.createdAt).isValid()
            ? dayjs(post.createdAt).fromNow()
            : ''}
        </time>
      </div>

      {post.imageUrl && (
        <div className='relative aspect-[4/3] w-full bg-black/30'>
          <Image
            src={post.imageUrl}
            alt={post.caption || 'Sociality post image'}
            fill
            sizes='(max-width: 768px) 100vw, 640px'
            unoptimized
            className='object-cover'
          />
        </div>
      )}

      <div className='space-y-4 p-4'>
        <div className='flex items-center gap-5 text-zinc-400'>
          <div
            className='flex items-center gap-2'
            aria-label={`${post.likesCount} likes`}
          >
            <Heart className='size-5' />
            <span className='text-sm'>{post.likesCount}</span>
          </div>

          <Link
            href={`/posts/${post.id}`}
            className='flex items-center gap-2 hover:text-purple-300'
            aria-label={`View ${post.commentsCount} comments`}
          >
            <MessageCircle className='size-5' />
            <span className='text-sm'>{post.commentsCount}</span>
          </Link>

          <Bookmark
            className='ml-auto size-5'
            aria-label='Save feature coming next'
          />
        </div>

        {post.caption && (
          <p className='whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200'>
            <span className='mr-2 font-semibold text-white'>
              {post.author.name}
            </span>
            {post.caption}
          </p>
        )}
      </div>
    </article>
  );
}
