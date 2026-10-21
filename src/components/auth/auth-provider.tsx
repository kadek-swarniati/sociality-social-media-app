'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { setApiToken } from '@/lib/api/client';
import type { SocialityUser } from '@/lib/api/auth';
import {
  clearSessionToken,
  getSessionToken,
  saveSessionToken,
} from '@/lib/auth/session';

type AuthContextValue = {
  user: SocialityUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (token: string, user: SocialityUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<SocialityUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const logout = useCallback(() => {
    clearSessionToken();
    setApiToken(null);
    setUser(null);
    setIsAuthenticated(false);
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback(
    (token: string, nextUser: SocialityUser) => {
      queryClient.clear();
      saveSessionToken(token);
      setApiToken(token);
      setUser(nextUser);
      setIsAuthenticated(true);
    },
    [queryClient]
  );

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const token = getSessionToken();

      if (!token) {
        if (active) {
          setIsInitializing(false);
        }
        return;
      }

      setApiToken(token);

      try {
        const { getCurrentUser } = await import('@/lib/api/auth');
        const currentUser = await getCurrentUser();

        if (active) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch {
        if (active) {
          logout();
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, [logout]);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('sociality:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('sociality:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isInitializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
