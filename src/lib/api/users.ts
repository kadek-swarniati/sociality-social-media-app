import { api } from '@/lib/api/client';

type Obj = Record<string, unknown>;

export type PublicUser = {
  id: number | null;
  name: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  followersCount: number | null;
  followingCount: number | null;
  isFollowing: boolean | null;
};

export type UserList = {
  users: PublicUser[];
  hasNextPage: boolean;
};

export type PublicPost = {
  id: number;
  caption: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
};

export type PublicPostList = {
  posts: PublicPost[];
  hasNextPage: boolean;
};

const isObj = (value: unknown): value is Obj =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const obj = (value: unknown): Obj => (isObj(value) ? value : {});

const str = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
};

const url = (value: unknown): string | null => {
  const result = str(value);
  return result.startsWith('https://') ||
    result.startsWith('http://') ||
    result.startsWith('/')
    ? result
    : null;
};

function unwrap(value: unknown): Obj {
  let current = obj(value);

  for (let i = 0; i < 3; i++) {
    if (isObj(current.data)) {
      current = current.data;
    } else if (isObj(current.user)) {
      current = current.user;
    } else if (isObj(current.profile)) {
      current = current.profile;
    } else {
      break;
    }
  }

  return current;
}

export function parsePublicUser(value: unknown): PublicUser {
  const user = unwrap(value);

  const username = str(user.username);

  if (!username) {
    throw new Error('API user has no username.');
  }

  return {
    id: num(user.id),
    name: str(user.name) || username,
    username,
    bio: str(user.bio),
    avatarUrl: url(user.avatarUrl) ?? url(user.avatar_url) ?? url(user.avatar),
    followersCount: num(user.followersCount ?? user.followers_count),
    followingCount: num(user.followingCount ?? user.following_count),
    isFollowing:
      typeof user.isFollowing === 'boolean'
        ? user.isFollowing
        : typeof user.is_following === 'boolean'
          ? user.is_following
          : null,
  };
}

function extractArray(
  response: unknown,
  keys: string[]
): { items: unknown[]; meta: Obj } {
  const root = obj(response);
  const data = root.data ?? response;

  if (Array.isArray(data)) {
    return { items: data, meta: root };
  }

  const payload = obj(data);

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return {
        items: payload[key] as unknown[],
        meta: payload,
      };
    }
  }

  if (Array.isArray(payload.data)) {
    return {
      items: payload.data,
      meta: payload,
    };
  }

  throw new Error('API returned an unsupported list format.');
}

function nextPage(
  meta: Obj,
  page: number,
  limit: number,
  count: number
): boolean {
  const pagination = obj(meta.pagination);

  const explicit =
    pagination.hasNextPage ??
    pagination.hasNext ??
    meta.hasNextPage ??
    meta.hasNext;

  if (typeof explicit === 'boolean') {
    return explicit;
  }

  const totalPages = num(pagination.totalPages ?? meta.totalPages);

  if (totalPages !== null) {
    return page < totalPages;
  }

  return count === limit;
}

function parseUsers(response: unknown, page: number, limit: number): UserList {
  const { items, meta } = extractArray(response, [
    'users',
    'results',
    'items',
    'followers',
    'following',
  ]);

  return {
    users: items.map(parsePublicUser),
    hasNextPage: nextPage(meta, page, limit, items.length),
  };
}

function parsePosts(
  response: unknown,
  page: number,
  limit: number
): PublicPostList {
  const { items, meta } = extractArray(response, [
    'posts',
    'results',
    'items',
    'likes',
  ]);

  const posts = items.map((entry) => {
    const raw = obj(entry);
    const post = isObj(raw.post) ? raw.post : raw;
    const id = num(post.id);

    if (id === null || id <= 0) {
      throw new Error('API post has an invalid ID.');
    }

    return {
      id,
      caption: str(post.caption),
      imageUrl: url(post.imageUrl) ?? url(post.image_url) ?? url(post.image),
      likesCount: num(post.likesCount ?? post.likes_count) ?? 0,
      commentsCount: num(post.commentsCount ?? post.comments_count) ?? 0,
    };
  });

  return {
    posts,
    hasNextPage: nextPage(meta, page, limit, items.length),
  };
}

export async function searchUsers(
  query: string,
  page = 1,
  limit = 10
): Promise<UserList> {
  const response = await api.get<unknown>('/users/search', {
    params: { q: query.trim(), page, limit },
  });

  return parseUsers(response.data, page, limit);
}

export async function getPublicUser(username: string): Promise<PublicUser> {
  const response = await api.get<unknown>(
    `/users/${encodeURIComponent(username)}`
  );

  return parsePublicUser(response.data);
}

export async function getUserPosts(
  username: string,
  page = 1,
  limit = 10
): Promise<PublicPostList> {
  const response = await api.get<unknown>(
    `/users/${encodeURIComponent(username)}/posts`,
    { params: { page, limit } }
  );

  return parsePosts(response.data, page, limit);
}

export async function getUserLikes(
  username: string,
  page = 1,
  limit = 10
): Promise<PublicPostList> {
  const response = await api.get<unknown>(
    `/users/${encodeURIComponent(username)}/likes`,
    { params: { page, limit } }
  );

  return parsePosts(response.data, page, limit);
}

export async function followUser(username: string): Promise<void> {
  await api.post(`/follow/${encodeURIComponent(username)}`);
}

export async function unfollowUser(username: string): Promise<void> {
  await api.delete(`/follow/${encodeURIComponent(username)}`);
}

export async function getUserFollowers(
  username: string,
  page = 1,
  limit = 10
): Promise<UserList> {
  const response = await api.get<unknown>(
    `/users/${encodeURIComponent(username)}/followers`,
    { params: { page, limit } }
  );

  return parseUsers(response.data, page, limit);
}

export async function getUserFollowing(
  username: string,
  page = 1,
  limit = 10
): Promise<UserList> {
  const response = await api.get<unknown>(
    `/users/${encodeURIComponent(username)}/following`,
    { params: { page, limit } }
  );

  return parseUsers(response.data, page, limit);
}

export async function getMyFollowers(page = 1, limit = 10): Promise<UserList> {
  const response = await api.get<unknown>('/me/followers', {
    params: { page, limit },
  });

  return parseUsers(response.data, page, limit);
}

export async function getMyFollowing(page = 1, limit = 10): Promise<UserList> {
  const response = await api.get<unknown>('/me/following', {
    params: { page, limit },
  });

  return parseUsers(response.data, page, limit);
}
