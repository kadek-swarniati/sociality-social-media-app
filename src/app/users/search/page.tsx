'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle, Search, UserRound } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import {
  followUser,
  getPublicUser,
  searchUsers,
  unfollowUser,
  type PublicUser,
  type UserList,
} from '@/lib/api/users';
import { getApiErrorMessage } from '@/lib/api/client';

const PAGE_SIZE = 10;

function UserResult({ user }: { user: PublicUser }) {
  const { user: currentUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');

  const isOwnProfile = !!currentUser && currentUser.username === user.username;

  const profileQuery = useQuery({
    queryKey: ['public-profile', user.username],
    queryFn: () => getPublicUser(user.username),
    enabled: isAuthenticated && !isOwnProfile && user.isFollowing === null,
    staleTime: 30_000,
  });

  const cachedProfile = queryClient.getQueryData<PublicUser>([
    'public-profile',
    user.username,
  ]);

  const isFollowing =
    cachedProfile?.isFollowing ??
    profileQuery.data?.isFollowing ??
    user.isFollowing;

  const followMutation = useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (currentlyFollowing) {
        await unfollowUser(user.username);
      } else {
        await followUser(user.username);
      }
    },

    onMutate: async (currentlyFollowing) => {
      setActionError('');

      await queryClient.cancelQueries({
        queryKey: ['public-profile', user.username],
      });

      const previous = queryClient.getQueryData<PublicUser>([
        'public-profile',
        user.username,
      ]);

      const source = previous ?? profileQuery.data ?? user;

      queryClient.setQueryData<PublicUser>(['public-profile', user.username], {
        ...source,
        isFollowing: !currentlyFollowing,
        followersCount:
          source.followersCount === null
            ? null
            : Math.max(
                0,
                source.followersCount + (currentlyFollowing ? -1 : 1)
              ),
      });

      return { previous };
    },

    onError: (error, _currentlyFollowing, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['public-profile', user.username],
          context.previous
        );
      } else {
        queryClient.removeQueries({
          queryKey: ['public-profile', user.username],
          exact: true,
        });
      }

      setActionError(getApiErrorMessage(error));
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['public-profile', user.username],
        }),
        queryClient.invalidateQueries({
          queryKey: ['users-search'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['my-profile'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['my-people'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['user-people', user.username],
        }),
        queryClient.invalidateQueries({
          queryKey: ['feed'],
        }),
      ]);
    },
  });

  const handleFollow = () => {
    if (
      !isAuthenticated ||
      isOwnProfile ||
      typeof isFollowing !== 'boolean' ||
      followMutation.isPending
    ) {
      return;
    }

    followMutation.mutate(isFollowing);
  };

  return (
    <div className='rounded-xl border border-white/10 bg-[#0A0D12] p-4 transition-colors hover:border-[#6936F2]/50'>
      <div className='flex items-center gap-3'>
        <Link
          href={`/profile/${encodeURIComponent(user.username)}`}
          aria-label={`View ${user.name}'s profile`}
          className='flex min-w-0 flex-1 items-center gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF]'
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
              <p className='mt-1 line-clamp-2 text-xs text-[#717680]'>
                {user.bio}
              </p>
            )}
          </div>
        </Link>

        {!isOwnProfile &&
          (!isAuthenticated ? (
            <Link
              href='/login'
              className='shrink-0 rounded-full border border-[#6936F2]/50 px-4 py-2 text-xs font-semibold text-[#B99AFF] transition-colors hover:bg-[#6936F2]/15'
            >
              Log in to follow
            </Link>
          ) : typeof isFollowing !== 'boolean' ? (
            <span
              className='shrink-0 text-xs text-[#A4A7AE]'
              title='Follow status is not available yet'
            >
              {profileQuery.isFetching ? (
                <LoaderCircle className='size-4 animate-spin' />
              ) : (
                'Status unavailable'
              )}
            </span>
          ) : (
            <button
              type='button'
              onClick={handleFollow}
              disabled={followMutation.isPending}
              aria-label={`${isFollowing ? 'Unfollow' : 'Follow'} ${user.username}`}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:cursor-not-allowed disabled:opacity-50 ${
                isFollowing
                  ? 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
                  : 'bg-[#6936F2] text-white hover:bg-[#7D55F5]'
              }`}
            >
              {followMutation.isPending
                ? 'Updating...'
                : isFollowing
                  ? 'Following'
                  : 'Follow'}
            </button>
          ))}
      </div>

      {actionError && (
        <p role='alert' className='mt-3 text-xs text-rose-400'>
          {actionError}
        </p>
      )}
    </div>
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

  const searchQuery = useInfiniteQuery<UserList>({
    queryKey: ['users-search', query],
    initialPageParam: 1,
    enabled: query.length >= 2,
    queryFn: ({ pageParam }) =>
      searchUsers(query, Number(pageParam), PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
    staleTime: 30_000,
  });

  const users = Array.from(
    new Map(
      (searchQuery.data?.pages.flatMap((page) => page.users) ?? []).map(
        (user) => [user.username, user] as const
      )
    ).values()
  );

  const isInitialError = searchQuery.isError && users.length === 0;

  const isLoadingMore = searchQuery.isFetchingNextPage;

  const loadMoreFailed = searchQuery.isFetchNextPageError;

  const isEmpty =
    searchQuery.isSuccess && users.length === 0 && !searchQuery.isFetching;

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
          <Search
            aria-hidden='true'
            className='absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#A4A7AE]'
          />

          <input
            type='search'
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Search name or username'
            aria-label='Search users'
            autoComplete='off'
            className='h-12 w-full rounded-full border border-white/10 bg-[#181D27] pl-12 pr-4 text-sm text-white outline-none placeholder:text-[#717680] focus:border-[#6936F2] focus-visible:ring-2 focus-visible:ring-[#6936F2]/30'
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
          ) : isInitialError ? (
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
          ) : isEmpty ? (
            <div className='rounded-xl border border-white/10 bg-[#0A0D12] px-6 py-12 text-center'>
              <UserRound className='mx-auto size-9 text-[#A989FF]' />

              <p className='mt-4 text-sm text-[#A4A7AE]'>
                No matching users found.
              </p>
            </div>
          ) : (
            users.map((user) => <UserResult key={user.username} user={user} />)
          )}

          {loadMoreFailed && users.length > 0 && (
            <p role='alert' className='text-center text-sm text-rose-400'>
              Could not load more people. Please try again.
            </p>
          )}

          {searchQuery.hasNextPage && users.length > 0 && (
            <button
              type='button'
              disabled={isLoadingMore || searchQuery.isRefetching}
              onClick={() => void searchQuery.fetchNextPage()}
              className='w-full rounded-full border border-white/15 py-3 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:opacity-50'
            >
              {isLoadingMore ? (
                <span className='inline-flex items-center gap-2'>
                  <LoaderCircle className='size-4 animate-spin' />
                  Loading...
                </span>
              ) : loadMoreFailed ? (
                'Retry loading people'
              ) : (
                'Load more people'
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
