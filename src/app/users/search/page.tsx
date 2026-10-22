'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, Search, UserRound } from 'lucide-react';

import { searchUsers, type PublicUser } from '@/lib/api/users';
import { getApiErrorMessage } from '@/lib/api/client';

const PAGE_SIZE = 10;

function UserResult({ user }: { user: PublicUser }) {
  return (
    <Link
      href={`/profile/${encodeURIComponent(user.username)}`}
      className='flex items-center gap-4 rounded-xl border border-white/10 bg-[#0A0D12] p-4 transition-colors hover:border-[#6936F2]/50'
    >
      <div className='relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2]/30 text-lg font-semibold'>
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            fill
            unoptimized
            sizes='48px'
            className='object-cover'
          />
        ) : (
          user.name.charAt(0).toUpperCase()
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-semibold'>{user.name}</p>

        <p className='truncate text-xs text-[#A4A7AE]'>@{user.username}</p>

        {user.bio && (
          <p className='mt-1 line-clamp-2 text-xs text-[#717680]'>{user.bio}</p>
        )}
      </div>
    </Link>
  );
}

export default function SearchUsersPage() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(input.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [input]);

  const searchQuery = useInfiniteQuery({
    queryKey: ['users-search', query],
    initialPageParam: 1,
    enabled: query.length >= 2,
    queryFn: ({ pageParam }) => searchUsers(query, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
  });

  const users = Array.from(
    new Map(
      (searchQuery.data?.pages.flatMap((page) => page.users) ?? []).map(
        (user) => [user.username, user]
      )
    ).values()
  );

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[640px]'>
        <Link
          href='/feed'
          className='mb-7 inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
        >
          <ArrowLeft className='size-4' />
          Timeline
        </Link>

        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Find People</h1>

          <p className='mt-2 text-sm text-[#A4A7AE]'>
            Discover people in the Sociality community.
          </p>
        </div>

        <div className='relative mt-7'>
          <Search className='absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#A4A7AE]' />

          <input
            type='search'
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Search name or username'
            aria-label='Search users'
            autoComplete='off'
            className='h-12 w-full rounded-full border border-white/10 bg-[#181D27] pr-4 pl-12 text-sm text-white outline-none placeholder:text-[#717680] focus:border-[#6936F2]'
          />
        </div>

        <div aria-live='polite' className='mt-7 space-y-3'>
          {query.length < 2 ? (
            <div className='rounded-xl border border-white/10 bg-[#0A0D12] px-6 py-12 text-center'>
              <UserRound className='mx-auto size-9 text-[#A989FF]' />

              <p className='mt-4 text-sm text-[#A4A7AE]'>
                Enter at least two characters to search.
              </p>
            </div>
          ) : searchQuery.isPending ? (
            <div
              role='status'
              className='flex items-center gap-3 text-sm text-[#A4A7AE]'
            >
              <LoaderCircle className='size-5 animate-spin' />
              Searching...
            </div>
          ) : searchQuery.isError ? (
            <div
              role='alert'
              className='rounded-xl border border-rose-500/20 bg-[#0A0D12] p-5'
            >
              <p className='text-sm text-rose-400'>
                {getApiErrorMessage(searchQuery.error)}
              </p>

              <button
                type='button'
                onClick={() => void searchQuery.refetch()}
                className='mt-3 text-sm font-semibold text-[#A989FF] hover:text-white'
              >
                Retry
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className='rounded-xl border border-white/10 bg-[#0A0D12] px-6 py-12 text-center'>
              <UserRound className='mx-auto size-9 text-[#A989FF]' />

              <p className='mt-4 text-sm text-[#A4A7AE]'>
                No matching users found.
              </p>
            </div>
          ) : (
            users.map((user) => <UserResult key={user.username} user={user} />)
          )}

          {searchQuery.hasNextPage && (
            <button
              type='button'
              disabled={searchQuery.isFetchingNextPage}
              onClick={() => void searchQuery.fetchNextPage()}
              className='w-full rounded-full border border-white/15 py-3 text-sm font-semibold transition-colors hover:bg-white/10 disabled:opacity-50'
            >
              {searchQuery.isFetchingNextPage
                ? 'Loading...'
                : 'Load more people'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
