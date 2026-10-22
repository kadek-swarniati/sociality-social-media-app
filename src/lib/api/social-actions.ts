import { api } from '@/lib/api/client';

type JsonObject = Record<string, unknown>;

type PostIdPage = {
  ids: number[];
  hasNextPage: boolean;
};

export type SocialActionStatus = {
  likedPostIds: Set<number>;
  savedPostIds: Set<number>;
};

const PAGE_SIZE = 20;
const MAX_PAGES = 100;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function toPositiveId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const root = toObject(value);
  const data = root.data ?? value;

  if (Array.isArray(data)) return data;

  const payload = toObject(data);

  const candidates = [
    payload.posts,
    payload.items,
    payload.results,
    payload.likes,
    payload.saved,
    payload.savedPosts,
    payload.data,
    root.posts,
    root.items,
    root.results,
  ];

  const items = candidates.find(Array.isArray);

  if (!Array.isArray(items)) {
    throw new Error('The API returned an unsupported social activity list.');
  }

  return items;
}

function getPostId(item: unknown): number | null {
  if (typeof item === 'number') {
    return toPositiveId(item);
  }

  if (!isObject(item)) return null;

  const nestedPost = toObject(item.post);

  return toPositiveId(nestedPost.id ?? item.postId ?? item.post_id ?? item.id);
}

function parsePage(response: unknown, page: number): PostIdPage {
  const root = toObject(response);
  const payload = toObject(root.data ?? response);
  const pagination = toObject(payload.pagination ?? root.pagination);

  const items = getItems(response);
  const ids = items.map(getPostId).filter((id): id is number => id !== null);

  const hasNext =
    pagination.hasNextPage ??
    pagination.hasNext ??
    payload.hasNextPage ??
    payload.hasNext ??
    root.hasNextPage;

  const totalPages = Number(
    pagination.totalPages ?? payload.totalPages ?? root.totalPages
  );

  let hasNextPage: boolean;

  if (typeof hasNext === 'boolean') {
    hasNextPage = hasNext;
  } else if (Number.isFinite(totalPages) && totalPages > 0) {
    hasNextPage = page < totalPages;
  } else {
    hasNextPage = items.length === PAGE_SIZE;
  }

  return { ids, hasNextPage };
}

async function fetchAllPostIds(
  endpoint: '/me/likes' | '/me/saved'
): Promise<Set<number>> {
  const ids = new Set<number>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await api.get<unknown>(endpoint, {
      params: {
        page,
        limit: PAGE_SIZE,
      },
    });

    const parsed = parsePage(response.data, page);

    for (const id of parsed.ids) {
      ids.add(id);
    }

    if (!parsed.hasNextPage) {
      return ids;
    }
  }

  throw new Error('The activity list exceeds the supported pagination limit.');
}

export function getMyLikedPostIds(): Promise<Set<number>> {
  return fetchAllPostIds('/me/likes');
}

export function getMySavedPostIds(): Promise<Set<number>> {
  return fetchAllPostIds('/me/saved');
}

export async function getSocialActionStatus(): Promise<SocialActionStatus> {
  const [likedPostIds, savedPostIds] = await Promise.all([
    getMyLikedPostIds(),
    getMySavedPostIds(),
  ]);

  return { likedPostIds, savedPostIds };
}
