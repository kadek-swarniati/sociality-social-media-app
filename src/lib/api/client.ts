import axios from 'axios';

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_SOCIALITY_API_URL ??
    'https://be-social-media-api-production.up.railway.app/api',
  timeout: 20000,
  headers: {
    Accept: 'application/json',
  },
});

export function setApiToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

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

  return 'Something went wrong. Please try again.';
}
