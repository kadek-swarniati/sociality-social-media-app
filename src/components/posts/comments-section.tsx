'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AlertCircle,
  LoaderCircle,
  MessageCircle,
  Send,
  Trash2,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { getApiErrorMessage } from '@/lib/api/client';
import { createComment, deleteComment, getPostComments } from '@/lib/api/posts';

type CommentsSectionProps = {
  postId: number;
  onCommentsChanged: () => Promise<void>;
};

const PAGE_SIZE = 10;
const MAX_COMMENT_LENGTH = 2000;

export default function CommentsSection({
  postId,
  onCommentsChanged,
}: CommentsSectionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const [content, setContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const commentsQuery = useInfiniteQuery({
    queryKey: ['post-comments', postId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getPostComments(postId, pageParam, PAGE_SIZE),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNextPage ? pages.length + 1 : undefined,
    staleTime: 15_000,
  });

  const comments =
    commentsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const uniqueComments = Array.from(
    new Map(comments.map((comment) => [comment.id, comment] as const)).values()
  );

  async function refreshComments() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['post-comments', postId],
      }),
      onCommentsChanged(),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (text: string) => createComment(postId, text),
    onSuccess: async () => {
      setContent('');
      setErrorMessage('');
      await refreshComments();
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: async () => {
      setErrorMessage('');
      await refreshComments();
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!isAuthenticated) {
      router.push(`/login?returnTo=${encodeURIComponent(`/posts/${postId}`)}`);
      return;
    }

    const trimmedContent = content.trim();

    if (
      !trimmedContent ||
      trimmedContent.length > MAX_COMMENT_LENGTH ||
      createMutation.isPending
    ) {
      return;
    }

    createMutation.mutate(trimmedContent);
  }

  const isInitialLoading = commentsQuery.isPending;
  const isInitialError = commentsQuery.isError && uniqueComments.length === 0;

  const isEmpty =
    commentsQuery.isSuccess &&
    uniqueComments.length === 0 &&
    !commentsQuery.isFetching;

  const isLoadingMore = commentsQuery.isFetchingNextPage;

  const loadMoreFailed = commentsQuery.isFetchNextPageError;

  return (
    <section
      id='comments'
      aria-labelledby='comments-heading'
      className='mt-6 rounded-2xl border border-white/10 bg-[#0A0D12] p-4 sm:p-5'
    >
      <div className='flex items-center gap-2'>
        <MessageCircle aria-hidden='true' className='size-5 text-[#B99AFF]' />

        <h2 id='comments-heading' className='text-lg font-semibold'>
          Comments
        </h2>
      </div>

      <form onSubmit={handleSubmit} className='mt-5 flex items-start gap-3'>
        <label htmlFor={`new-comment-${postId}`} className='sr-only'>
          Write a comment
        </label>

        <textarea
          id={`new-comment-${postId}`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={2}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder='Write a comment...'
          disabled={createMutation.isPending}
          className='min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-white/10 bg-[#181D27] px-4 py-3 text-sm text-white outline-none placeholder:text-[#717680] focus:border-[#7F51F9]'
        />

        <button
          type='submit'
          disabled={!content.trim() || createMutation.isPending}
          aria-label='Post comment'
          className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[#6936F2] text-white transition-colors hover:bg-[#7F51F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:opacity-40'
        >
          {createMutation.isPending ? (
            <LoaderCircle aria-hidden='true' className='size-5 animate-spin' />
          ) : (
            <Send aria-hidden='true' className='size-5' />
          )}
        </button>
      </form>

      <div className='mt-2 flex justify-end'>
        <span className='text-xs text-[#717680]'>
          {content.length}/{MAX_COMMENT_LENGTH}
        </span>
      </div>

      {errorMessage && (
        <p role='alert' className='mt-3 text-sm text-rose-400'>
          {errorMessage}
        </p>
      )}

      <div className='mt-6 space-y-5'>
        {isInitialLoading && (
          <div
            role='status'
            className='flex items-center gap-2 text-sm text-[#A4A7AE]'
          >
            <LoaderCircle className='size-4 animate-spin' />
            Loading comments...
          </div>
        )}

        {isInitialError && (
          <div role='alert'>
            <div className='flex items-center gap-2 text-sm text-rose-400'>
              <AlertCircle className='size-4' />
              {getApiErrorMessage(commentsQuery.error)}
            </div>

            <button
              type='button'
              onClick={() => void commentsQuery.refetch()}
              className='mt-3 text-sm font-medium text-[#B99AFF] hover:underline'
            >
              Retry loading comments
            </button>
          </div>
        )}

        {isEmpty && (
          <p className='text-sm text-[#A4A7AE]'>
            No comments yet. Start the conversation.
          </p>
        )}

        {uniqueComments.map((comment) => {
          const isOwner =
            !!user &&
            ((comment.author.id !== null &&
              Number(user.id) === comment.author.id) ||
              (!!comment.author.username &&
                user.username === comment.author.username));

          const date = comment.createdAt ? dayjs(comment.createdAt) : null;

          const formattedDate = date?.isValid()
            ? date.format('MMM D, YYYY · HH:mm')
            : null;

          return (
            <article
              key={comment.id}
              className='border-b border-white/[0.08] pb-4 last:border-b-0'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  {comment.author.username ? (
                    <Link
                      href={`/profile/${encodeURIComponent(
                        comment.author.username
                      )}`}
                      className='text-sm font-semibold hover:text-[#B99AFF]'
                    >
                      {comment.author.name}
                    </Link>
                  ) : (
                    <span className='text-sm font-semibold'>
                      {comment.author.name}
                    </span>
                  )}

                  <p className='mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#D5D7DA]'>
                    {comment.content}
                  </p>

                  {formattedDate && (
                    <time
                      dateTime={comment.createdAt}
                      className='mt-2 block text-xs text-[#717680]'
                    >
                      {formattedDate}
                    </time>
                  )}
                </div>

                {isOwner && (
                  <button
                    type='button'
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!window.confirm('Delete this comment?')) {
                        return;
                      }

                      setDeletingId(comment.id);
                      setErrorMessage('');
                      deleteMutation.mutate(comment.id);
                    }}
                    aria-label='Delete your comment'
                    className='rounded-full p-2 text-[#A4A7AE] transition-colors hover:bg-white/10 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:opacity-40'
                  >
                    {deletingId === comment.id && deleteMutation.isPending ? (
                      <LoaderCircle className='size-4 animate-spin' />
                    ) : (
                      <Trash2 className='size-4' />
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {loadMoreFailed && (
        <p role='alert' className='mt-5 text-center text-sm text-rose-400'>
          Could not load more comments.
        </p>
      )}

      {commentsQuery.hasNextPage && (
        <button
          type='button'
          onClick={() => void commentsQuery.fetchNextPage()}
          disabled={isLoadingMore || commentsQuery.isRefetching}
          className='mt-5 w-full rounded-full border border-white/15 py-3 text-sm font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B99AFF] disabled:opacity-40'
        >
          {isLoadingMore
            ? 'Loading...'
            : loadMoreFailed
              ? 'Retry loading comments'
              : 'Load more comments'}
        </button>
      )}
    </section>
  );
}
