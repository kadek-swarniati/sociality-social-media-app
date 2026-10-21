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
