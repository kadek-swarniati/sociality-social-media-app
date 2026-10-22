'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ArrowLeft, Heart, LoaderCircle, UserRound, Users } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  followUser,
  getPublicUser,
  getUserFollowers,
  getUserFollowing,
  getUserLikes,
  getUserPosts,
  unfollowUser,
  type PublicPost,
  type PublicUser,
} from '@/lib/api/users';

type Tab = 'posts' | 'likes' | 'followers' | 'following';
const PAGE_SIZE = 10;

function ProfilePost({ post }: { post: PublicPost }) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className='group overflow-hidden rounded-xl border border-white/10 bg-[#0A0D12]'
    >
      <div className='relative aspect-square bg-[#181D27]'>
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.caption || 'Sociality post'}
            fill
            unoptimized
            sizes='(max-width: 640px) 50vw, 300px'
            className='object-cover transition-transform duration-300 group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full items-center justify-center text-xs text-[#A4A7AE]'>
            No image
          </div>
        )}
      </div>

      <div className='flex items-center gap-4 p-3 text-xs text-[#A4A7AE]'>
        <span className='flex items-center gap-1'>
          <Heart className='size-4' />
          {post.likesCount}
        </span>
        <span>{post.commentsCount} comments</span>
      </div>
    </Link>
  );
}

function ProfileUserRow({ user }: { user: PublicUser }) {
  return (
    <Link
      href={`/profile/${encodeURIComponent(user.username)}`}
      className='flex items-center gap-3 rounded-xl border border-white/10 bg-[#0A0D12] p-4 hover:border-[#6936F2]/40'
    >
      <div className='relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#6936F2]/25'>
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            fill
            unoptimized
            sizes='40px'
            className='object-cover'
          />
        ) : (
          <UserRound className='size-5' />
        )}
      </div>
      <div className='min-w-0'>
        <p className='truncate text-sm font-semibold'>{user.name}</p>
        <p className='truncate text-xs text-[#A4A7AE]'>@{user.username}</p>
      </div>
    </Link>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [tab, setTab] = useState<Tab>('posts');
  const [actionError, setActionError] = useState('');

  const profileQuery = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => getPublicUser(username),
    enabled: !!username,
  });

  const profile = profileQuery.data;

  const isOwnProfile = !!currentUser && currentUser.username === username;

  const postsQuery = useInfiniteQuery({
    queryKey: ['user-posts', username, tab],
    enabled: tab === 'posts' || tab === 'likes',
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      tab === 'likes'
        ? getUserLikes(username, pageParam, PAGE_SIZE)
        : getUserPosts(username, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
  });

  const peopleQuery = useInfiniteQuery({
    queryKey: ['user-people', username, tab],
    enabled: tab === 'followers' || tab === 'following',
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      tab === 'followers'
        ? getUserFollowers(username, pageParam, PAGE_SIZE)
        : getUserFollowing(username, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
  });

  const followMutation = useMutation({
    mutationFn: async (currentlyFollowing: boolean) => {
      if (currentlyFollowing) {
        await unfollowUser(username);
      } else {
        await followUser(username);
      }
    },
    onMutate: async (currentlyFollowing) => {
      await queryClient.cancelQueries({
        queryKey: ['public-profile', username],
      });

      const previous = queryClient.getQueryData<PublicUser>([
        'public-profile',
        username,
      ]);

      if (previous) {
        queryClient.setQueryData<PublicUser>(['public-profile', username], {
          ...previous,
          isFollowing: !currentlyFollowing,
          followersCount:
            previous.followersCount === null
              ? null
              : Math.max(
                  0,
                  previous.followersCount + (currentlyFollowing ? -1 : 1)
                ),
        });
      }

      return { previous };
    },
    onError: (error, _value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['public-profile', username],
          context.previous
        );
      }
      setActionError(getApiErrorMessage(error));
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['public-profile', username],
        }),
        queryClient.invalidateQueries({
          queryKey: ['user-people', username],
        }),
        queryClient.invalidateQueries({
          queryKey: ['feed'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['me'],
        }),
      ]);
    },
  });

  const posts = Array.from(
    new Map(
      (postsQuery.data?.pages.flatMap((page) => page.posts) ?? []).map(
        (post) => [post.id, post]
      )
    ).values()
  );

  const people = Array.from(
    new Map(
      (peopleQuery.data?.pages.flatMap((page) => page.users) ?? []).map(
        (person) => [person.username, person]
      )
    ).values()
  );

  const isPeopleTab = tab === 'followers' || tab === 'following';

  const activeQuery = isPeopleTab ? peopleQuery : postsQuery;

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[720px]'>
        <Link
          href='/feed'
          className='mb-7 inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
        >
          <ArrowLeft className='size-4' />
          Timeline
        </Link>

        {profileQuery.isPending ? (
          <div
            role='status'
            className='animate-pulse rounded-2xl border border-white/10 bg-[#0A0D12] p-8'
          >
            Loading profile...
          </div>
        ) : profileQuery.isError ? (
          <div role='alert' className='rounded-xl border border-white/10 p-6'>
            <p>{getApiErrorMessage(profileQuery.error)}</p>
            <button
              type='button'
              onClick={() => void profileQuery.refetch()}
              className='mt-3 text-[#A989FF]'
            >
              Retry
            </button>
          </div>
        ) : profile ? (
          <>
            <section className='rounded-2xl border border-white/10 bg-[#0A0D12] p-5 sm:p-7'>
              <div className='flex flex-col gap-5 sm:flex-row sm:items-start'>
                <div className='relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2]/25 text-3xl font-semibold'>
                  {profile.avatarUrl ? (
                    <Image
                      src={profile.avatarUrl}
                      alt={profile.name}
                      fill
                      unoptimized
                      sizes='80px'
                      className='object-cover'
                    />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className='min-w-0 flex-1'>
                  <h1 className='text-2xl font-semibold'>{profile.name}</h1>
                  <p className='mt-1 text-sm text-[#A4A7AE]'>
                    @{profile.username}
                  </p>

                  {profile.bio && (
                    <p className='mt-4 whitespace-pre-wrap text-sm leading-6 text-[#D5D7DA]'>
                      {profile.bio}
                    </p>
                  )}

                  <div className='mt-5 flex flex-wrap gap-5 text-xs text-[#A4A7AE]'>
                    <button
                      type='button'
                      onClick={() => setTab('followers')}
                      className='hover:text-white'
                    >
                      <strong className='text-white'>
                        {profile.followersCount ?? '—'}
                      </strong>{' '}
                      Followers
                    </button>

                    <button
                      type='button'
                      onClick={() => setTab('following')}
                      className='hover:text-white'
                    >
                      <strong className='text-white'>
                        {profile.followingCount ?? '—'}
                      </strong>{' '}
                      Following
                    </button>
                  </div>
                </div>

                {isOwnProfile ? (
                  <Link
                    href='/me'
                    className='rounded-full border border-white/15 px-5 py-2 text-center text-xs font-semibold hover:bg-white/10'
                  >
                    My Profile
                  </Link>
                ) : (
                  <button
                    type='button'
                    disabled={
                      followMutation.isPending ||
                      (isAuthenticated && profile.isFollowing === null)
                    }
                    onClick={() => {
                      if (!isAuthenticated) {
                        router.push(
                          `/login?returnTo=${encodeURIComponent(
                            `/profile/${username}`
                          )}`
                        );
                        return;
                      }

                      if (profile.isFollowing === null) {
                        return;
                      }

                      setActionError('');
                      followMutation.mutate(profile.isFollowing);
                    }}
                    className='rounded-full bg-[#6936F2] px-6 py-2 text-xs font-semibold hover:bg-[#7F51F9] disabled:opacity-50'
                  >
                    {followMutation.isPending ? (
                      <LoaderCircle className='size-4 animate-spin' />
                    ) : !isAuthenticated ? (
                      'Log in to Follow'
                    ) : profile.isFollowing === null ? (
                      'Status unavailable'
                    ) : profile.isFollowing ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </button>
                )}
              </div>

              {actionError && (
                <p role='alert' className='mt-4 text-sm text-rose-400'>
                  {actionError}
                </p>
              )}
            </section>

            <nav
              aria-label='Profile sections'
              className='mt-6 grid grid-cols-4 border-b border-white/10'
            >
              {(
                [
                  ['posts', 'Posts'],
                  ['likes', 'Likes'],
                  ['followers', 'Followers'],
                  ['following', 'Following'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setTab(value)}
                  aria-current={tab === value ? 'page' : undefined}
                  className={`border-b-2 px-2 py-4 text-xs font-semibold sm:text-sm ${
                    tab === value
                      ? 'border-[#6936F2] text-white'
                      : 'border-transparent text-[#A4A7AE] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <section className='mt-6'>
              {activeQuery.isPending ? (
                <div
                  role='status'
                  className='flex items-center gap-2 text-sm text-[#A4A7AE]'
                >
                  <LoaderCircle className='size-4 animate-spin' />
                  Loading...
                </div>
              ) : activeQuery.isError ? (
                <div
                  role='alert'
                  className='rounded-xl border border-white/10 p-5'
                >
                  <p className='text-sm text-rose-400'>
                    {getApiErrorMessage(activeQuery.error)}
                  </p>
                  <button
                    type='button'
                    onClick={() => {
                      if (isPeopleTab) {
                        void peopleQuery.refetch();
                      } else {
                        void postsQuery.refetch();
                      }
                    }}
                    className='mt-3 text-sm text-[#A989FF]'
                  >
                    Retry
                  </button>
                </div>
              ) : isPeopleTab ? (
                people.length === 0 ? (
                  <div className='py-12 text-center text-sm text-[#A4A7AE]'>
                    <Users className='mx-auto mb-3 size-8' />
                    No users found.
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {people.map((person) => (
                      <ProfileUserRow key={person.username} user={person} />
                    ))}
                  </div>
                )
              ) : posts.length === 0 ? (
                <p className='py-12 text-center text-sm text-[#A4A7AE]'>
                  No posts available.
                </p>
              ) : (
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {posts.map((post) => (
                    <ProfilePost key={post.id} post={post} />
                  ))}
                </div>
              )}

              {activeQuery.hasNextPage && (
                <button
                  type='button'
                  disabled={activeQuery.isFetchingNextPage}
                  onClick={() => {
                    if (isPeopleTab) {
                      void peopleQuery.fetchNextPage();
                    } else {
                      void postsQuery.fetchNextPage();
                    }
                  }}
                  className='mt-6 w-full rounded-full border border-white/15 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50'
                >
                  {activeQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                </button>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
