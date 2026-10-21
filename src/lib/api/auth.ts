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

export async function registerUser(payload: RegisterPayload) {
  const response = await api.post<unknown>('/auth/register', payload);
  return response.data;
}

export async function loginUser(payload: LoginPayload) {
  const response = await api.post<unknown>('/auth/login', payload);
  return response.data;
}
