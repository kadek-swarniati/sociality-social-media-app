'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Heart, LoaderCircle, Pencil, Users } from 'lucide-react';

import {
  getMyProfile,
  getMyPostList,
  type AccountPost,
} from '@/lib/api/account';
import { getMyFollowers, getMyFollowing } from '@/lib/api/users';
import { getApiErrorMessage } from '@/lib/api/client';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setActiveProfileTab, type ProfileTab } from '@/store/ui-slice';

const PAGE_SIZE = 12;

function PostTile({ post }: { post: AccountPost }) {
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
            sizes='(max-width: 640px) 50vw, 240px'
            className='object-cover transition-transform duration-300 group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full items-center justify-center p-4 text-center text-xs text-[#A4A7AE]'>
            {post.caption || 'Post'}
          </div>
        )}
      </div>

      <div className='flex gap-4 p-3 text-xs text-[#A4A7AE]'>
        <span className='inline-flex items-center gap-1'>
          <Heart className='size-4' />
          {post.likesCount}
        </span>
        <span>{post.commentsCount} comments</span>
      </div>
    </Link>
  );
}

export default function MyProfilePage() {
  const dispatch = useAppDispatch();

  const tab = useAppSelector((state) => state.ui.activeProfileTab);

  const setTab = (value: ProfileTab) => {
    dispatch(setActiveProfileTab(value));
  };

  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: getMyProfile,
  });

  const postsQuery = useInfiniteQuery({
    queryKey: ['my-post-list', tab],
    enabled: tab === 'posts' || tab === 'likes' || tab === 'saved',
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getMyPostList(
        tab === 'likes' || tab === 'saved' ? tab : 'posts',
        pageParam,
        PAGE_SIZE
      ),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
  });

  const peopleQuery = useInfiniteQuery({
    queryKey: ['my-people', tab],
    enabled: tab === 'followers' || tab === 'following',
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      tab === 'followers'
        ? getMyFollowers(pageParam, PAGE_SIZE)
        : getMyFollowing(pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
  });

  const isPeopleTab = tab === 'followers' || tab === 'following';

  const activeQuery = isPeopleTab ? peopleQuery : postsQuery;

  const posts = Array.from(
    new Map(
      (postsQuery.data?.pages.flatMap((page) => page.items) ?? []).map(
        (post) => [post.id, post]
      )
    ).values()
  );

  const people = Array.from(
    new Map(
      (peopleQuery.data?.pages.flatMap((page) => page.users) ?? []).map(
        (user) => [user.username, user]
      )
    ).values()
  );

  const profile = profileQuery.data;

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[760px]'>
        <Link
          href='/feed'
          className='mb-7 inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
        >
          <ArrowLeft className='size-4' />
          Timeline
        </Link>

        {profileQuery.isPending ? (
          <p
            role='status'
            className='flex items-center gap-2 text-sm text-[#A4A7AE]'
          >
            <LoaderCircle className='size-4 animate-spin' />
            Loading your profile...
          </p>
        ) : profileQuery.isError ? (
          <div role='alert' className='rounded-xl border border-white/10 p-5'>
            <p>{getApiErrorMessage(profileQuery.error)}</p>
            <button
              type='button'
              onClick={() => void profileQuery.refetch()}
              className='mt-3 text-sm text-[#A989FF]'
            >
              Retry
            </button>
          </div>
        ) : profile ? (
          <>
            <section className='rounded-2xl border border-white/10 bg-[#0A0D12] p-6'>
              <div className='flex flex-col gap-5 sm:flex-row sm:items-center'>
                <div className='relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2]/30 text-2xl font-semibold'>
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
                    profile.name.charAt(0).toUpperCase() || '?'
                  )}
                </div>

                <div className='min-w-0 flex-1'>
                  <h1 className='text-2xl font-semibold'>{profile.name}</h1>
                  <p className='mt-1 text-sm text-[#A4A7AE]'>
                    @{profile.username}
                  </p>

                  {profile.bio && (
                    <p className='mt-3 whitespace-pre-wrap text-sm leading-6 text-[#D5D7DA]'>
                      {profile.bio}
                    </p>
                  )}

                  <p className='mt-3 text-xs text-[#717680]'>{profile.email}</p>
                </div>

                <Link
                  href='/me/edit'
                  className='inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-xs font-semibold hover:bg-white/10'
                >
                  <Pencil className='size-4' />
                  Edit Profile
                </Link>
              </div>
            </section>

            <nav
              aria-label='My profile sections'
              className='mt-6 flex gap-1 overflow-x-auto border-b border-white/10'
            >
              {(
                [
                  ['posts', 'My Posts'],
                  ['likes', 'Likes'],
                  ['saved', 'Saved'],
                  ['followers', 'Followers'],
                  ['following', 'Following'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => setTab(value)}
                  aria-current={tab === value ? 'page' : undefined}
                  className={`shrink-0 border-b-2 px-3 py-4 text-xs font-semibold ${
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
                <p
                  role='status'
                  className='flex items-center gap-2 text-sm text-[#A4A7AE]'
                >
                  <LoaderCircle className='size-4 animate-spin' />
                  Loading...
                </p>
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
                    No users to display.
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {people.map((user) => (
                      <Link
                        key={user.username}
                        href={`/profile/${encodeURIComponent(user.username)}`}
                        className='flex items-center gap-3 rounded-xl border border-white/10 bg-[#0A0D12] p-4 hover:border-[#6936F2]/40'
                      >
                        <div className='relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6936F2]/30'>
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
                            user.name.charAt(0).toUpperCase() || '?'
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold'>
                            {user.name}
                          </p>
                          <p className='truncate text-xs text-[#A4A7AE]'>
                            @{user.username}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )
              ) : posts.length === 0 ? (
                <div className='rounded-xl border border-white/10 bg-[#0A0D12] py-12 text-center text-sm text-[#A4A7AE]'>
                  No {tab} to display.
                </div>
              ) : (
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {posts.map((post) => (
                    <PostTile key={post.id} post={post} />
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
