'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  Heart,
  LoaderCircle,
  MessageCircle,
  Trash2,
  Users,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import CommentsSection from '@/components/posts/comments-section';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  deletePost,
  getPost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  type PostDetail,
} from '@/lib/api/posts';
import {
  getSocialActionStatus,
  type SocialActionStatus,
} from '@/lib/api/social-actions';

const STATUS_KEY = ['social-action-status'];

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const postId = Number(params.id);
  const validId = Number.isSafeInteger(postId) && postId > 0;

  const [actionError, setActionError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPost(postId),
    enabled: validId,
  });

  const statusQuery = useQuery({
    queryKey: STATUS_KEY,
    queryFn: getSocialActionStatus,
    enabled: validId && isAuthenticated,
    staleTime: 30_000,
    retry: 1,
  });

  const post = postQuery.data;
  const status = statusQuery.data;

  const isLiked = status?.likedPostIds.has(postId) ?? post?.isLiked ?? false;

  const isSaved = status?.savedPostIds.has(postId) ?? post?.isSaved ?? false;

  const actionsReady = isAuthenticated && statusQuery.isSuccess;

  const isOwner =
    !!post &&
    !!user &&
    ((post.author.id !== null && Number(user.id) === post.author.id) ||
      (!!post.author.username && user.username === post.author.username));

  async function invalidatePostLists() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['post', postId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['feed'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['me'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['explore-posts'],
      }),
    ]);
  }

  function updateCachedStatus(kind: 'like' | 'save', enabled: boolean) {
    queryClient.setQueryData<SocialActionStatus>(STATUS_KEY, (previous) => {
      if (!previous) return previous;

      const likedPostIds = new Set(previous.likedPostIds);

      const savedPostIds = new Set(previous.savedPostIds);

      const target = kind === 'like' ? likedPostIds : savedPostIds;

      if (enabled) {
        target.add(postId);
      } else {
        target.delete(postId);
      }

      return {
        likedPostIds,
        savedPostIds,
      };
    });
  }

  const likeMutation = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (currentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    },

    onMutate: async (currentlyLiked) => {
      setActionError('');

      await Promise.all([
        queryClient.cancelQueries({
          queryKey: STATUS_KEY,
        }),
        queryClient.cancelQueries({
          queryKey: ['post', postId],
        }),
      ]);

      const previousStatus =
        queryClient.getQueryData<SocialActionStatus>(STATUS_KEY);

      const previousPost = queryClient.getQueryData<PostDetail>([
        'post',
        postId,
      ]);

      updateCachedStatus('like', !currentlyLiked);

      if (previousPost) {
        queryClient.setQueryData<PostDetail>(['post', postId], {
          ...previousPost,
          isLiked: !currentlyLiked,
          likesCount: Math.max(
            0,
            previousPost.likesCount + (currentlyLiked ? -1 : 1)
          ),
        });
      }

      return {
        previousStatus,
        previousPost,
      };
    },

    onError: (error, _value, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(STATUS_KEY, context.previousStatus);
      }

      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost);
      }

      setActionError(getApiErrorMessage(error));
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: STATUS_KEY,
        }),
        invalidatePostLists(),
      ]);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (currentlySaved: boolean) => {
      if (currentlySaved) {
        await unsavePost(postId);
      } else {
        await savePost(postId);
      }
    },

    onMutate: async (currentlySaved) => {
      setActionError('');

      await Promise.all([
        queryClient.cancelQueries({
          queryKey: STATUS_KEY,
        }),
        queryClient.cancelQueries({
          queryKey: ['post', postId],
        }),
      ]);

      const previousStatus =
        queryClient.getQueryData<SocialActionStatus>(STATUS_KEY);

      const previousPost = queryClient.getQueryData<PostDetail>([
        'post',
        postId,
      ]);

      updateCachedStatus('save', !currentlySaved);

      if (previousPost) {
        queryClient.setQueryData<PostDetail>(['post', postId], {
          ...previousPost,
          isSaved: !currentlySaved,
        });
      }

      return {
        previousStatus,
        previousPost,
      };
    },

    onError: (error, _value, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(STATUS_KEY, context.previousStatus);
      }

      if (context?.previousPost) {
        queryClient.setQueryData(['post', postId], context.previousPost);
      }

      setActionError(getApiErrorMessage(error));
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: STATUS_KEY,
        }),
        invalidatePostLists(),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),

    onSuccess: async () => {
      await invalidatePostLists();
      router.replace('/feed');
    },

    onError: (error) => {
      setActionError(getApiErrorMessage(error));
      setConfirmDelete(false);
    },
  });

  if (!validId) {
    return (
      <main className='min-h-screen bg-black p-8 text-white'>
        <p>Invalid post ID.</p>

        <Link href='/feed' className='mt-4 inline-block text-[#A989FF]'>
          Back to Timeline
        </Link>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-black px-4 py-8 text-white'>
      <div className='mx-auto max-w-[680px]'>
        <Link
          href='/feed'
          className='mb-6 inline-flex items-center gap-2 text-sm text-[#A4A7AE] hover:text-white'
        >
          <ArrowLeft className='size-4' />
          Timeline
        </Link>

        {postQuery.isPending ? (
          <div
            role='status'
            className='animate-pulse rounded-2xl border border-white/10 bg-[#0A0D12] p-8'
          >
            Loading post...
          </div>
        ) : postQuery.isError ? (
          <section
            role='alert'
            className='rounded-2xl border border-white/10 bg-[#0A0D12] p-6'
          >
            <p>{getApiErrorMessage(postQuery.error)}</p>

            <button
              type='button'
              onClick={() => void postQuery.refetch()}
              className='mt-4 text-[#A989FF]'
            >
              Try again
            </button>
          </section>
        ) : post ? (
          <>
            <article className='overflow-hidden rounded-2xl border border-white/10 bg-[#0A0D12]'>
              <header className='flex items-center justify-between gap-3 p-5'>
                <div>
                  <Link
                    href={
                      post.author.username
                        ? `/profile/${encodeURIComponent(post.author.username)}`
                        : `/posts/${postId}`
                    }
                    className='font-semibold hover:text-[#A989FF]'
                  >
                    {post.author.name}
                  </Link>

                  <p className='text-xs text-[#A4A7AE]'>
                    {post.author.username
                      ? `@${post.author.username}`
                      : 'Sociality'}
                  </p>
                </div>

                {isOwner && (
                  <button
                    type='button'
                    onClick={() => setConfirmDelete(true)}
                    aria-label='Delete post'
                    className='rounded-full p-2 text-[#A4A7AE] hover:bg-white/10 hover:text-rose-400'
                  >
                    <Trash2 className='size-5' />
                  </button>
                )}
              </header>

              {post.imageUrl && (
                <div className='flex w-full items-center justify-center overflow-hidden bg-[#0A0D12]'>
                  <Image
                    src={post.imageUrl}
                    alt={post.caption || 'Sociality post'}
                    width={1200}
                    height={1200}
                    unoptimized
                    sizes='(max-width: 680px) 100vw, 680px'
                    className='block h-auto max-h-[75vh] w-full object-contain'
                  />
                </div>
              )}

              <div className='p-5'>
                <div className='flex items-center gap-5'>
                  <button
                    type='button'
                    disabled={!actionsReady || likeMutation.isPending}
                    onClick={() => {
                      likeMutation.mutate(isLiked);
                    }}
                    aria-label={isLiked ? 'Unlike post' : 'Like post'}
                    aria-pressed={isLiked}
                    className='flex items-center gap-2 transition-colors hover:text-[#D9206E] disabled:opacity-40'
                  >
                    {likeMutation.isPending ? (
                      <LoaderCircle className='size-5 animate-spin' />
                    ) : (
                      <Heart
                        className={`size-5 ${
                          isLiked ? 'fill-[#D9206E] text-[#D9206E]' : ''
                        }`}
                      />
                    )}

                    <span>{post.likesCount}</span>
                  </button>

                  <a
                    href='#comments'
                    className='flex items-center gap-2 hover:text-[#A989FF]'
                  >
                    <MessageCircle className='size-5' />
                    <span>{post.commentsCount}</span>
                  </a>

                  <button
                    type='button'
                    disabled={!actionsReady || saveMutation.isPending}
                    onClick={() => {
                      saveMutation.mutate(isSaved);
                    }}
                    aria-label={isSaved ? 'Unsave post' : 'Save post'}
                    aria-pressed={isSaved}
                    className='ml-auto hover:text-[#A989FF] disabled:opacity-40'
                  >
                    {saveMutation.isPending ? (
                      <LoaderCircle className='size-5 animate-spin' />
                    ) : (
                      <Bookmark
                        className={`size-5 ${
                          isSaved ? 'fill-[#6936F2] text-[#A989FF]' : ''
                        }`}
                      />
                    )}
                  </button>
                </div>

                {statusQuery.isPending && isAuthenticated && (
                  <p className='mt-3 text-xs text-[#A4A7AE]'>
                    Loading your Like and Save status...
                  </p>
                )}

                {statusQuery.isError && isAuthenticated && (
                  <div role='alert' className='mt-3 text-xs text-rose-400'>
                    <p>Unable to load Like and Save status.</p>

                    <button
                      type='button'
                      onClick={() => void statusQuery.refetch()}
                      className='mt-2 font-semibold text-[#A989FF]'
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isAuthenticated && (
                  <p className='mt-3 text-xs text-[#A4A7AE]'>
                    <Link
                      href={`/login?returnTo=${encodeURIComponent(
                        `/posts/${postId}`
                      )}`}
                      className='text-[#A989FF]'
                    >
                      Log in
                    </Link>{' '}
                    to Like or Save this post.
                  </p>
                )}

                <Link
                  href={`/posts/${postId}/likes`}
                  className='mt-4 inline-flex items-center gap-2 text-xs text-[#A989FF] hover:underline'
                >
                  <Users className='size-4' />
                  View people who liked this post
                </Link>

                {post.caption && (
                  <p className='mt-4 whitespace-pre-wrap break-words text-sm leading-6'>
                    {post.caption}
                  </p>
                )}

                {post.createdAt && (
                  <time
                    dateTime={post.createdAt}
                    className='mt-3 block text-xs text-[#717680]'
                  >
                    {new Date(post.createdAt).toLocaleString()}
                  </time>
                )}
              </div>
            </article>

            {actionError && (
              <p role='alert' className='mt-4 text-sm text-rose-400'>
                {actionError}
              </p>
            )}

            {confirmDelete && (
              <section
                role='dialog'
                aria-modal='true'
                aria-label='Confirm post deletion'
                className='mt-4 rounded-xl border border-rose-500/30 bg-[#181D27] p-5'
              >
                <h2 className='font-semibold'>Delete this post?</h2>

                <p className='mt-2 text-sm text-[#A4A7AE]'>
                  This action cannot be undone.
                </p>

                <div className='mt-4 flex gap-3'>
                  <button
                    type='button'
                    onClick={() => setConfirmDelete(false)}
                    className='rounded-full border border-white/20 px-5 py-2 text-sm'
                  >
                    Cancel
                  </button>

                  <button
                    type='button'
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    className='rounded-full bg-[#D9206E] px-5 py-2 text-sm disabled:opacity-50'
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </section>
            )}

            <CommentsSection
              postId={postId}
              onCommentsChanged={invalidatePostLists}
            />
          </>
        ) : null}
      </div>
    </main>
  );
}
