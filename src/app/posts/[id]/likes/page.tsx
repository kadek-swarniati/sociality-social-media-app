'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Heart,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from 'lucide-react';

import { getPostLikes } from '@/lib/api/posts';
import { getApiErrorMessage } from '@/lib/api/client';

type JsonObject = Record<string, unknown>;

type LikedUser = {
  id: number | null;
  name: string;
  username: string;
  avatarUrl: string | null;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asId(value: unknown): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function asUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const url = value.trim();

  if (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('/')
  ) {
    return url;
  }

  return null;
}

function parseLikedUsers(response: unknown): LikedUser[] {
  const root = asObject(response);

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to retrieve likes.');
  }

  const data = root.data ?? response;
  const payload = asObject(data);

  const candidates: unknown[] = [
    data,
    payload.items,
    payload.users,
    payload.likes,
    payload.results,
    payload.data,
    root.items,
    root.users,
    root.likes,
  ];

  const rawUsers = candidates.find(Array.isArray);

  if (!Array.isArray(rawUsers)) {
    throw new Error('The API returned an unrecognized Liked By response.');
  }

  const users = rawUsers.map((entry: unknown) => {
    const item = asObject(entry);
    const nestedUser = item.user ?? item.author;
    const user = isObject(nestedUser) ? nestedUser : item;

    return {
      id: asId(user.id),
      name:
        asString(user.name) || asString(user.username) || 'Sociality member',
      username: asString(user.username),
      avatarUrl:
        asUrl(user.avatarUrl) ?? asUrl(user.avatar_url) ?? asUrl(user.avatar),
    };
  });

  const unique = new Map<string, LikedUser>();

  for (const user of users) {
    const key = user.username || (user.id !== null ? String(user.id) : '');

    if (key) {
      unique.set(key, user);
    }
  }

  return Array.from(unique.values());
}

export default function PostLikesPage() {
  const params = useParams<{ id: string }>();

  const postId = Number(params.id);

  const validId = Number.isSafeInteger(postId) && postId > 0;

  const likesQuery = useQuery({
    queryKey: ['post-likes', postId],
    queryFn: async () => {
      const response = await getPostLikes(postId);
      return parseLikedUsers(response);
    },
    enabled: validId,
  });

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[600px]'>
        <Link
          href={validId ? `/posts/${postId}` : '/feed'}
          className='mb-8 inline-flex items-center gap-2 text-sm text-[#A4A7AE] transition-colors hover:text-white'
        >
          <ArrowLeft className='size-4' />
          Back to post
        </Link>

        <div className='mb-6 flex items-center gap-3'>
          <div className='flex size-11 items-center justify-center rounded-full bg-[#D9206E]/15 text-[#D9206E]'>
            <Heart className='size-5' />
          </div>

          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>Liked By</h1>

            <p className='mt-1 text-xs text-[#A4A7AE]'>
              People who liked this post
            </p>
          </div>
        </div>

        {!validId ? (
          <section
            role='alert'
            className='rounded-xl border border-white/10 bg-[#0A0D12] p-6'
          >
            Invalid post ID.
          </section>
        ) : likesQuery.isPending ? (
          <div
            role='status'
            className='flex items-center gap-3 rounded-xl border border-white/10 bg-[#0A0D12] p-6 text-sm text-[#A4A7AE]'
          >
            <LoaderCircle className='size-5 animate-spin' />
            Loading people who liked this post...
          </div>
        ) : likesQuery.isError ? (
          <section
            role='alert'
            className='rounded-xl border border-rose-500/20 bg-[#0A0D12] p-6'
          >
            <p className='text-sm text-rose-400'>
              {getApiErrorMessage(likesQuery.error)}
            </p>

            <button
              type='button'
              onClick={() => void likesQuery.refetch()}
              className='mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#A989FF]'
            >
              <RefreshCw className='size-4' />
              Try again
            </button>
          </section>
        ) : likesQuery.data.length === 0 ? (
          <section className='rounded-xl border border-white/10 bg-[#0A0D12] px-6 py-12 text-center'>
            <Heart className='mx-auto mb-4 size-8 text-[#A989FF]' />

            <p className='font-semibold'>No likes yet</p>

            <p className='mt-2 text-sm text-[#A4A7AE]'>
              People who like this post will appear here.
            </p>
          </section>
        ) : (
          <section className='overflow-hidden rounded-xl border border-white/10 bg-[#0A0D12]'>
            <div className='border-b border-white/10 px-5 py-4 text-sm text-[#A4A7AE]'>
              {likesQuery.data.length} people
            </div>

            <ul className='divide-y divide-white/[0.08]'>
              {likesQuery.data.map((person) => {
                const profileHref = person.username
                  ? `/profile/${encodeURIComponent(person.username)}`
                  : null;

                const content = (
                  <>
                    <div className='relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2]/20 text-[#B9A1FF]'>
                      {person.avatarUrl ? (
                        <Image
                          src={person.avatarUrl}
                          alt={person.name}
                          fill
                          unoptimized
                          sizes='44px'
                          className='object-cover'
                        />
                      ) : (
                        <UserRound className='size-5' />
                      )}
                    </div>

                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>
                        {person.name}
                      </p>

                      {person.username && (
                        <p className='truncate text-xs text-[#A4A7AE]'>
                          @{person.username}
                        </p>
                      )}
                    </div>
                  </>
                );

                const key = person.username || String(person.id);

                return (
                  <li key={key}>
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        className='flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.04]'
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className='flex items-center gap-3 px-5 py-4'>
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
