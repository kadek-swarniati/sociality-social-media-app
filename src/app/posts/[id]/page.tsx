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
  MessageCircle,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  deletePost,
  getPost,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
} from '@/lib/api/posts';
import CommentsSection from '@/components/posts/comments-section';

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

  const post = postQuery.data;

  const invalidatePostLists = async () => {
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
    ]);
  };

  const likeMutation = useMutation({
    mutationFn: async (liked: boolean) => {
      if (liked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    },
    onMutate: async (liked) => {
      await queryClient.cancelQueries({
        queryKey: ['post', postId],
      });

      const previous = queryClient.getQueryData<NonNullable<typeof post>>([
        'post',
        postId,
      ]);

      if (previous) {
        queryClient.setQueryData(['post', postId], {
          ...previous,
          isLiked: !liked,
          likesCount: Math.max(0, previous.likesCount + (liked ? -1 : 1)),
        });
      }

      return { previous };
    },
    onError: (error, _liked, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['post', postId], context.previous);
      }

      setActionError(getApiErrorMessage(error));
    },
    onSettled: invalidatePostLists,
  });

  const saveMutation = useMutation({
    mutationFn: async (saved: boolean) => {
      if (saved) {
        await unsavePost(postId);
      } else {
        await savePost(postId);
      }
    },
    onMutate: async (saved) => {
      await queryClient.cancelQueries({
        queryKey: ['post', postId],
      });

      const previous = queryClient.getQueryData<NonNullable<typeof post>>([
        'post',
        postId,
      ]);

      if (previous) {
        queryClient.setQueryData(['post', postId], {
          ...previous,
          isSaved: !saved,
        });
      }

      return { previous };
    },
    onError: (error, _saved, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['post', postId], context.previous);
      }

      setActionError(getApiErrorMessage(error));
    },
    onSettled: invalidatePostLists,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['feed'],
      });

      await queryClient.invalidateQueries({
        queryKey: ['me'],
      });

      router.replace('/feed');
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error));
      setConfirmDelete(false);
    },
  });

  function requireLogin(): boolean {
    if (isAuthenticated) return true;

    router.push(`/login?returnTo=${encodeURIComponent(`/posts/${postId}`)}`);

    return false;
  }

  const isOwner =
    !!post &&
    !!user &&
    ((post.author.id !== null && Number(user.id) === post.author.id) ||
      (!!post.author.username && user.username === post.author.username));

  if (!validId) {
    return (
      <main className='mx-auto max-w-2xl p-8'>
        <p>Invalid post ID.</p>
        <Link href='/feed'>Back to Timeline</Link>
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
          <div role='alert' className='rounded-2xl border border-white/10 p-6'>
            <p>{getApiErrorMessage(postQuery.error)}</p>
            <button
              type='button'
              onClick={() => void postQuery.refetch()}
              className='mt-4 text-[#A989FF]'
            >
              Try again
            </button>
          </div>
        ) : post ? (
          <>
            <article className='overflow-hidden rounded-2xl border border-white/10 bg-[#0A0D12]'>
              <div className='flex items-center justify-between gap-3 p-5'>
                <div>
                  <Link
                    href={
                      post.author.username
                        ? `/profile/${encodeURIComponent(post.author.username)}`
                        : '#'
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
              </div>

              {post.imageUrl && (
                <div className='relative aspect-square bg-[#181D27]'>
                  <Image
                    src={post.imageUrl}
                    alt={post.caption || 'Sociality post'}
                    fill
                    unoptimized
                    sizes='(max-width: 680px) 100vw, 680px'
                    className='object-contain'
                  />
                </div>
              )}

              <div className='p-5'>
                <div className='flex items-center gap-5'>
                  <button
                    type='button'
                    disabled={likeMutation.isPending || post.isLiked === null}
                    onClick={() => {
                      if (!requireLogin()) return;
                      if (post.isLiked === null) return;

                      setActionError('');
                      likeMutation.mutate(post.isLiked);
                    }}
                    aria-label={post.isLiked ? 'Unlike post' : 'Like post'}
                    aria-pressed={post.isLiked ?? false}
                    className='flex items-center gap-2 disabled:opacity-40'
                  >
                    <Heart
                      className={`size-5 ${
                        post.isLiked ? 'fill-[#D9206E] text-[#D9206E]' : ''
                      }`}
                    />
                    <span>{post.likesCount}</span>
                  </button>

                  <a href='#comments' className='flex items-center gap-2'>
                    <MessageCircle className='size-5' />
                    <span>{post.commentsCount}</span>
                  </a>

                  <button
                    type='button'
                    disabled={saveMutation.isPending || post.isSaved === null}
                    onClick={() => {
                      if (!requireLogin()) return;
                      if (post.isSaved === null) return;

                      setActionError('');
                      saveMutation.mutate(post.isSaved);
                    }}
                    aria-label={post.isSaved ? 'Unsave post' : 'Save post'}
                    aria-pressed={post.isSaved ?? false}
                    className='ml-auto disabled:opacity-40'
                  >
                    <Bookmark
                      className={`size-5 ${
                        post.isSaved ? 'fill-[#6936F2] text-[#A989FF]' : ''
                      }`}
                    />
                  </button>
                </div>

                {(post.isLiked === null || post.isSaved === null) && (
                  <p className='mt-3 text-xs text-[#A4A7AE]'>
                    Some action states are unavailable in the post response and
                    need API verification.
                  </p>
                )}

                {post.caption && (
                  <p className='mt-4 whitespace-pre-wrap text-sm leading-6'>
                    {post.caption}
                  </p>
                )}

                {post.createdAt && (
                  <time className='mt-3 block text-xs text-[#717680]'>
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
