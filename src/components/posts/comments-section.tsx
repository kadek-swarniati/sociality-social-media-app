'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { LoaderCircle, Send, Trash2 } from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { getApiErrorMessage } from '@/lib/api/client';
import { createComment, deleteComment, getPostComments } from '@/lib/api/posts';

type CommentsSectionProps = {
  postId: number;
  onCommentsChanged: () => Promise<void>;
};

const PAGE_SIZE = 10;

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
  });

  const comments =
    commentsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const uniqueComments = Array.from(
    new Map(comments.map((comment) => [comment.id, comment])).values()
  );

  async function refreshComments() {
    await queryClient.invalidateQueries({
      queryKey: ['post-comments', postId],
    });

    await onCommentsChanged();
  }

  const createMutation = useMutation({
    mutationFn: (text: string) => createComment(postId, text),
    onSuccess: async () => {
      setContent('');
      await refreshComments();
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: async () => {
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

    if (!content.trim() || createMutation.isPending) {
      return;
    }

    createMutation.mutate(content.trim());
  }

  return (
    <section
      id='comments'
      className='mt-6 rounded-2xl border border-white/10 bg-[#0A0D12] p-5'
    >
      <h2 className='text-lg font-semibold'>Comments</h2>

      <form onSubmit={handleSubmit} className='mt-5 flex items-start gap-3'>
        <label htmlFor='new-comment' className='sr-only'>
          Write a comment
        </label>

        <textarea
          id='new-comment'
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder='Write a comment...'
          disabled={createMutation.isPending}
          className='min-h-12 flex-1 resize-y rounded-xl border border-white/10 bg-[#181D27] px-4 py-3 text-sm outline-none placeholder:text-[#717680] focus:border-[#7F51F9]'
        />

        <button
          type='submit'
          disabled={!content.trim() || createMutation.isPending}
          aria-label='Post comment'
          className='flex size-11 items-center justify-center rounded-full bg-[#6936F2] disabled:opacity-40'
        >
          {createMutation.isPending ? (
            <LoaderCircle className='size-5 animate-spin' />
          ) : (
            <Send className='size-5' />
          )}
        </button>
      </form>

      {errorMessage && (
        <p role='alert' className='mt-3 text-sm text-rose-400'>
          {errorMessage}
        </p>
      )}

      <div className='mt-6 space-y-5'>
        {commentsQuery.isPending ? (
          <p role='status' className='text-sm text-[#A4A7AE]'>
            Loading comments...
          </p>
        ) : commentsQuery.isError ? (
          <div role='alert'>
            <p className='text-sm text-rose-400'>
              {getApiErrorMessage(commentsQuery.error)}
            </p>
            <button
              type='button'
              onClick={() => void commentsQuery.refetch()}
              className='mt-2 text-sm text-[#A989FF]'
            >
              Retry
            </button>
          </div>
        ) : uniqueComments.length === 0 ? (
          <p className='text-sm text-[#A4A7AE]'>
            No comments yet. Start the conversation.
          </p>
        ) : (
          uniqueComments.map((comment) => {
            const isOwner =
              !!user &&
              ((comment.author.id !== null &&
                Number(user.id) === comment.author.id) ||
                (!!comment.author.username &&
                  user.username === comment.author.username));

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
                        className='text-sm font-semibold hover:text-[#A989FF]'
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

                    {comment.createdAt && (
                      <time className='mt-2 block text-xs text-[#717680]'>
                        {new Date(comment.createdAt).toLocaleString()}
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
                      className='rounded-full p-2 text-[#A4A7AE] hover:bg-white/10 hover:text-rose-400 disabled:opacity-40'
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
          })
        )}
      </div>

      {commentsQuery.hasNextPage && (
        <button
          type='button'
          onClick={() => void commentsQuery.fetchNextPage()}
          disabled={commentsQuery.isFetchingNextPage}
          className='mt-5 w-full rounded-full border border-white/15 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-40'
        >
          {commentsQuery.isFetchingNextPage
            ? 'Loading...'
            : 'Load more comments'}
        </button>
      )}
    </section>
  );
}
