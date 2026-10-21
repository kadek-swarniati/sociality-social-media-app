'use client';

import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';

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
  const initial = post.author.name.charAt(0).toUpperCase() || '?';
  const validDate = dayjs(post.createdAt).isValid();

  return (
    <article className='overflow-hidden rounded-xl border border-white/[0.08] bg-[#0A0D12] font-sans'>
      <header className='flex items-center gap-3 px-4 py-3.5'>
        <Link
          href={`/users/${encodeURIComponent(post.author.username)}`}
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
          <div
            aria-label={`${post.likesCount} likes`}
            title='Like action will be enabled with the API integration'
            className='flex items-center gap-1.5'
          >
            <Heart className='size-[19px]' aria-hidden='true' />
            <span className='text-[12px]'>{post.likesCount}</span>
          </div>

          <Link
            href={`/posts/${post.id}`}
            aria-label={`View ${post.commentsCount} comments`}
            className='flex items-center gap-1.5 transition-colors hover:text-[#B9A1FF]'
          >
            <MessageCircle className='size-[19px]' />
            <span className='text-[12px]'>{post.commentsCount}</span>
          </Link>

          <div
            aria-label='Save action is not yet available'
            title='Save action will be enabled with the API integration'
            className='ml-auto'
          >
            <Bookmark className='size-[19px]' aria-hidden='true' />
          </div>
        </div>

        {post.caption && (
          <p className='whitespace-pre-wrap break-words text-[13px] leading-[21px] text-[#D5D7DA]'>
            <Link
              href={`/users/${encodeURIComponent(post.author.username)}`}
              className='mr-2 font-semibold text-white hover:text-[#B9A1FF]'
            >
              {post.author.username}
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
