import { api } from './client';

export type RegisterPayload = {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type SocialityUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: SocialityUser;
  };
};

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asId(value: unknown): number {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

function asUrl(value: unknown): string | null {
  const result = asString(value).trim();

  if (
    result.startsWith('https://') ||
    result.startsWith('http://') ||
    result.startsWith('/')
  ) {
    return result;
  }

  return null;
}

function parseUser(value: unknown): SocialityUser {
  const root = asObject(value);
  const data = asObject(root.data);

  const candidate =
    root.profile ?? root.user ?? data.profile ?? data.user ?? value;

  const user = asObject(candidate);

  const id = asId(user.id);
  const username = asString(user.username);

  if (!id || !username) {
    throw new Error('The API returned an invalid user profile.');
  }

  return {
    id,
    name: asString(user.name) || username,
    username,
    email: asString(user.email),
    phone: asString(user.phone) || null,
    avatarUrl:
      asUrl(user.avatarUrl) ?? asUrl(user.avatar_url) ?? asUrl(user.avatar),
  };
}

export async function registerUser(payload: RegisterPayload) {
  const response = await api.post<unknown>('/auth/register', payload);

  return response.data;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<unknown>('/auth/login', payload);

  const root = asObject(response.data);
  const data = asObject(root.data);
  const token = asString(data.token);

  if (root.success === false || !token) {
    throw new Error(
      asString(root.message) || 'Invalid login response from server.'
    );
  }

  return {
    success: true,
    message: asString(root.message),
    data: {
      token,
      user: parseUser(data.user ?? data.profile),
    },
  };
}

export async function getCurrentUser(): Promise<SocialityUser> {
  const response = await api.get<unknown>('/me');
  const root = asObject(response.data);

  if (root.success === false) {
    throw new Error(asString(root.message) || 'Unable to load current user.');
  }

  return parseUser(response.data);
}
