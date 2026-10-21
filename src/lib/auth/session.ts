const SESSION_KEY = 'sociality_auth_token';

export function getSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!token.trim()) {
    throw new Error('Cannot save an empty authentication token.');
  }

  window.localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export function hasSessionToken(): boolean {
  return Boolean(getSessionToken());
}
