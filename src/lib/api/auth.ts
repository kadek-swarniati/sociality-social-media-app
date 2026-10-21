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

export async function registerUser(payload: RegisterPayload) {
  const response = await api.post<unknown>('/auth/register', payload);

  return response.data;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', payload);

  const result = response.data;

  if (
    result.success !== true ||
    typeof result.data?.token !== 'string' ||
    !result.data.token ||
    !result.data.user
  ) {
    throw new Error('Invalid login response from server.');
  }

  return result;
}

export async function getCurrentUser(): Promise<SocialityUser> {
  const response = await api.get<{
    success: boolean;
    data: SocialityUser;
  }>('/me');

  return response.data.data;
}
