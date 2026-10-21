import type { FeedPost } from '@/components/feed/post-card';

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(object: JsonObject, keys: string[]): string | null {
  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
}

function getNumber(object: JsonObject, keys: string[]): number {
  for (const key of keys) {
    const value = object[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function getNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return null;
}

function getPost(value: unknown): FeedPost {
  if (!isObject(value)) {
    throw new Error('Feed contains an invalid post.');
  }

  const author = value.author ?? value.user;

  if (!isObject(author)) {
    throw new Error('Feed post has no recognizable author object.');
  }

  const id = getNumericValue(value.id);
  const name = getString(author, ['name']);
  const username = getString(author, ['username']);
  const createdAt = getString(value, ['createdAt', 'created_at']);

  if (
    id === null ||
    !Number.isInteger(id) ||
    !name ||
    !username ||
    !createdAt
  ) {
    throw new Error('Feed post fields differ from the expected API structure.');
  }

  return {
    id,
    caption: getString(value, ['caption']) ?? '',
    imageUrl: getString(value, ['imageUrl', 'image_url']),
    createdAt,
    author: {
      name,
      username,
      avatarUrl: getString(author, ['avatarUrl', 'avatar_url']),
    },
    likesCount: getNumber(value, ['likesCount', 'likeCount', 'likes_count']),
    commentsCount: getNumber(value, [
      'commentsCount',
      'commentCount',
      'comments_count',
    ]),
  };
}

export type ParsedFeed = {
  posts: FeedPost[];
  hasNextPage: boolean | null;
};

export function parseFeedResponse(response: unknown): ParsedFeed {
  if (!isObject(response)) {
    throw new Error('Feed API returned an invalid response.');
  }

  if (response.success === false) {
    throw new Error(getString(response, ['message']) ?? 'Feed request failed.');
  }

  const payload = response.data ?? response;

  let items: unknown;
  let metadata: JsonObject | null = null;

  if (Array.isArray(payload)) {
    items = payload;
  } else if (isObject(payload)) {
    items = payload.posts ?? payload.items ?? payload.results ?? payload.data;

    metadata = payload;
  }

  if (!Array.isArray(items)) {
    throw new Error(
      'Feed response format is not recognized. Verify the GET /feed response.'
    );
  }

  const posts = items.map(getPost);

  const pagination =
    metadata && isObject(metadata.pagination) ? metadata.pagination : metadata;

  let hasNextPage: boolean | null = null;

  if (pagination) {
    if (typeof pagination.hasNextPage === 'boolean') {
      hasNextPage = pagination.hasNextPage;
    } else if (typeof pagination.hasNext === 'boolean') {
      hasNextPage = pagination.hasNext;
    } else {
      const currentPage =
        getNumericValue(pagination.page) ??
        getNumericValue(pagination.currentPage);

      const totalPages =
        getNumericValue(pagination.totalPages) ??
        getNumericValue(pagination.lastPage);

      if (currentPage !== null && totalPages !== null) {
        hasNextPage = currentPage < totalPages;
      }
    }
  }

  return {
    posts,
    hasNextPage,
  };
}
