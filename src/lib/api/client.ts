import axios from 'axios';
import { clearSessionToken, getSessionToken } from '@/lib/auth/session';

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_SOCIALITY_API_URL ??
    'https://be-social-media-api-production.up.railway.app/api',
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

export function setApiToken(token: string | null): void {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.request.use((config) => {
  const token = getSessionToken();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers.delete('Authorization');
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      getSessionToken()
    ) {
      clearSessionToken();
      setApiToken(null);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('sociality:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;

    if (data && typeof data === 'object') {
      const response = data as Record<string, unknown>;

      if (typeof response.message === 'string') {
        return response.message;
      }

      if (typeof response.error === 'string') {
        return response.error;
      }
    }

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }

    if (!error.response) {
      return 'Unable to connect to the server.';
    }

    return `Request failed (${error.response.status}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
