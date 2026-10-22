import { api } from '@/lib/api/client';

export type CreatePostPayload = {
  image: File;
  caption: string;
};

export type PostAuthor = {
  id: number | null;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type PostDetail = {
  id: number;
  caption: string;
  imageUrl: string | null;
  createdAt: string;
  author: PostAuthor;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean | null;
  isSaved: boolean | null;
};

export type PostComment = {
  id: number;
  content: string;
  createdAt: string;
  author: PostAuthor;
};

export type PaginatedComments = {
  items: PostComment[];
  hasNextPage: boolean;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function asId(value: unknown): number {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asUrl(value: unknown): string | null {
  const url = asString(value).trim();

  if (!url) return null;

  if (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('/')
  ) {
    return url;
  }

  return null;
}

function unwrap(value: unknown): JsonObject {
  let current = asObject(value);

  for (let i = 0; i < 3; i++) {
    if (isObject(current.data)) {
      current = current.data;
    } else if (isObject(current.post)) {
      current = current.post;
    } else if (isObject(current.comment)) {
      current = current.comment;
    } else {
      break;
    }
  }

  return current;
}

function parseAuthor(value: unknown): PostAuthor {
  const author = asObject(value);

  return {
    id: asId(author.id) || null,
    name:
      asString(author.name) || asString(author.username) || 'Sociality User',
    username: asString(author.username),
    avatarUrl:
      asUrl(author.avatarUrl) ??
      asUrl(author.avatar_url) ??
      asUrl(author.avatar),
  };
}

export function parsePostDetail(value: unknown): PostDetail {
  const post = unwrap(value);
  const id = asId(post.id);

  if (!id) {
    throw new Error('The API returned a post without a valid ID.');
  }

  return {
    id,
    caption: asString(post.caption) || asString(post.content),
    imageUrl:
      asUrl(post.imageUrl) ?? asUrl(post.image_url) ?? asUrl(post.image),
    createdAt: asString(post.createdAt) || asString(post.created_at),
    author: parseAuthor(post.author ?? post.user),
    likesCount: Math.max(0, asNumber(post.likesCount ?? post.likes_count ?? 0)),
    commentsCount: Math.max(
      0,
      asNumber(post.commentsCount ?? post.comments_count ?? 0)
    ),
    isLiked: asBoolean(post.isLiked ?? post.is_liked ?? post.likedByMe),
    isSaved: asBoolean(post.isSaved ?? post.is_saved ?? post.savedByMe),
  };
}

export function parseComments(
  value: unknown,
  page: number,
  limit: number
): PaginatedComments {
  const root = asObject(value);
  const data = root.data ?? value;
  const payload = asObject(data);

  const candidates = [
    data,
    payload.comments,
    payload.items,
    payload.results,
    root.comments,
    root.items,
  ];

  const rawItems = candidates.find(Array.isArray);

  if (!Array.isArray(rawItems)) {
    throw new Error('The comments response format is not recognized.');
  }

  const items: PostComment[] = rawItems
    .map((entry: unknown) => {
      const comment = asObject(entry);

      return {
        id: asId(comment.id),
        content:
          asString(comment.content) ||
          asString(comment.text) ||
          asString(comment.comment),
        createdAt: asString(comment.createdAt) || asString(comment.created_at),
        author: parseAuthor(comment.author ?? comment.user),
      };
    })
    .filter((comment) => comment.id > 0);

  const pagination = asObject(payload.pagination ?? root.pagination);

  const hasNext =
    pagination.hasNextPage ??
    pagination.hasNext ??
    payload.hasNextPage ??
    payload.hasNext;

  const totalPages = asNumber(pagination.totalPages ?? payload.totalPages);

  return {
    items,
    hasNextPage:
      typeof hasNext === 'boolean'
        ? hasNext
        : totalPages > 0
          ? page < totalPages
          : items.length === limit,
  };
}

export async function createPost({
  image,
  caption,
}: CreatePostPayload): Promise<unknown> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('caption', caption.trim());

  const response = await api.post<unknown>('/posts', formData, {
    timeout: 60000,
  });

  return response.data;
}

export async function getPost(id: number): Promise<PostDetail> {
  const response = await api.get<unknown>(`/posts/${id}`);

  return parsePostDetail(response.data);
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/posts/${id}`);
}

export async function getPostComments(
  id: number,
  page = 1,
  limit = 10
): Promise<PaginatedComments> {
  const response = await api.get<unknown>(`/posts/${id}/comments`, {
    params: { page, limit },
  });

  return parseComments(response.data, page, limit);
}

export async function createComment(
  postId: number,
  content: string
): Promise<unknown> {
  const response = await api.post<unknown>(`/posts/${postId}/comments`, {
    content: content.trim(),
  });

  return response.data;
}

export async function deleteComment(commentId: number): Promise<void> {
  await api.delete(`/comments/${commentId}`);
}

export async function likePost(postId: number): Promise<void> {
  await api.post(`/posts/${postId}/like`);
}

export async function unlikePost(postId: number): Promise<void> {
  await api.delete(`/posts/${postId}/like`);
}

export async function savePost(postId: number): Promise<void> {
  await api.post(`/posts/${postId}/save`);
}

export async function unsavePost(postId: number): Promise<void> {
  await api.delete(`/posts/${postId}/save`);
}

export async function getPostLikes(postId: number): Promise<unknown> {
  const response = await api.get<unknown>(`/posts/${postId}/likes`);

  return response.data;
}
