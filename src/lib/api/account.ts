import { api } from '@/lib/api/client';
import { getPost } from '@/lib/api/posts';

type JsonObject = Record<string, unknown>;

export type MyProfile = {
  id: number | null;
  name: string;
  username: string;
  email: string;
  phone: string;
  bio: string;
  avatarUrl: string | null;
};

export type AccountPost = {
  id: number;
  caption: string;
  imageUrl: string | null;
  likesCount: number | null;
  commentsCount: number | null;
};

export type AccountPostPage = {
  items: AccountPost[];
  hasNextPage: boolean;
};

export type EditProfilePayload = {
  name: string;
  username: string;
  phone: string;
  bio: string;
  avatar?: File | null;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result) ? result : null;
}

function count(value: unknown): number | null {
  const result = number(value);

  return result === null ? null : Math.max(0, result);
}

function imageUrl(value: unknown): string | null {
  const result = string(value).trim();

  if (
    result.startsWith('https://') ||
    result.startsWith('http://') ||
    result.startsWith('/')
  ) {
    return result;
  }

  return null;
}

function unwrap(value: unknown): JsonObject {
  let current = object(value);

  for (let i = 0; i < 3; i++) {
    if (isObject(current.data)) {
      current = current.data;
    } else if (isObject(current.user)) {
      current = current.user;
    } else if (isObject(current.profile)) {
      current = current.profile;
    } else {
      break;
    }
  }

  return current;
}

export function parseMyProfile(value: unknown): MyProfile {
  const data = unwrap(value);

  if (!string(data.username)) {
    throw new Error('The profile response does not contain a username.');
  }

  return {
    id: number(data.id),
    name: string(data.name),
    username: string(data.username),
    email: string(data.email),
    phone: string(data.phone),
    bio: string(data.bio),
    avatarUrl:
      imageUrl(data.avatarUrl) ??
      imageUrl(data.avatar_url) ??
      imageUrl(data.avatar),
  };
}

export async function getMyProfile(): Promise<MyProfile> {
  const response = await api.get<unknown>('/me');

  return parseMyProfile(response.data);
}

function getArray(value: unknown): {
  items: unknown[];
  metadata: JsonObject;
} {
  if (Array.isArray(value)) {
    return {
      items: value,
      metadata: {},
    };
  }

  const root = object(value);
  const data = root.data ?? value;

  if (Array.isArray(data)) {
    return {
      items: data,
      metadata: root,
    };
  }

  const payload = object(data);

  for (const key of [
    'posts',
    'items',
    'results',
    'likes',
    'saved',
    'savedPosts',
    'data',
  ]) {
    if (Array.isArray(payload[key])) {
      return {
        items: payload[key] as unknown[],
        metadata: payload,
      };
    }
  }

  throw new Error('The API returned an unsupported post list format.');
}

function parsePostPage(
  response: unknown,
  page: number,
  limit: number
): AccountPostPage {
  const { items, metadata } = getArray(response);

  const posts: AccountPost[] = items.map((entry: unknown) => {
    const raw = object(entry);

    const post = isObject(raw.post) ? raw.post : raw;

    const id = number(post.id);

    if (id === null || !Number.isSafeInteger(id) || id <= 0) {
      throw new Error('A post has an invalid ID.');
    }

    return {
      id,

      caption: string(post.caption) || string(post.content),

      imageUrl:
        imageUrl(post.imageUrl) ??
        imageUrl(post.image_url) ??
        imageUrl(post.image),

      likesCount: count(post.likeCount ?? post.likesCount ?? post.likes_count),

      commentsCount: count(
        post.commentCount ?? post.commentsCount ?? post.comments_count
      ),
    };
  });

  const pagination = object(metadata.pagination);

  const explicit =
    pagination.hasNextPage ??
    pagination.hasNext ??
    metadata.hasNextPage ??
    metadata.hasNext;

  const totalPages = number(pagination.totalPages ?? metadata.totalPages);

  const hasNextPage =
    typeof explicit === 'boolean'
      ? explicit
      : totalPages !== null
        ? page < totalPages
        : items.length === limit;

  return {
    items: posts,
    hasNextPage,
  };
}

async function enrichSavedPosts(posts: AccountPost[]): Promise<AccountPost[]> {
  return Promise.all(
    posts.map(async (post) => {
      if (post.likesCount !== null && post.commentsCount !== null) {
        return post;
      }

      try {
        const detail = await getPost(post.id);

        return {
          ...post,
          likesCount: detail.likesCount,
          commentsCount: detail.commentsCount,
        };
      } catch {
        return post;
      }
    })
  );
}

export async function getMyPostList(
  category: 'posts' | 'likes' | 'saved',
  page = 1,
  limit = 12
): Promise<AccountPostPage> {
  const endpoint =
    category === 'posts'
      ? '/me/posts'
      : category === 'likes'
        ? '/me/likes'
        : '/me/saved';

  const response = await api.get<unknown>(endpoint, {
    params: {
      page,
      limit,
    },
  });

  const result = parsePostPage(response.data, page, limit);

  if (category !== 'saved') {
    return result;
  }

  return {
    ...result,
    items: await enrichSavedPosts(result.items),
  };
}

export async function updateMyProfile(
  payload: EditProfilePayload
): Promise<MyProfile> {
  const formData = new FormData();

  formData.append('name', payload.name.trim());

  formData.append('username', payload.username.trim());

  formData.append('phone', payload.phone.trim());

  formData.append('bio', payload.bio.trim());

  if (payload.avatar) {
    formData.append('avatar', payload.avatar);
  }

  const response = await api.patch<unknown>('/me', formData, {
    timeout: 60000,
  });

  return parseMyProfile(response.data);
}
