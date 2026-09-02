import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useDispatch } from 'react-redux';

import * as authService from '../services/authService';
import { getToken, removeToken, setToken } from '../utils/authStorage';
import { subscribeUnauthorized } from '../utils/authEvents';
import { resetConnectionState } from '../store/slices/connectionSlice.js';

/**
 * NEXORA — AuthContext.
 *
 * Single source of truth for frontend authentication. Pages and route
 * guards read `user`, `isAuthenticated`, and `isLoading`, and trigger
 * state changes through `login`, `register`, `logout`, and
 * `refreshCurrentUser`.
 *
 * On logout / 401 the AuthContext also resets the connection slice — a
 * previous user's cached status / lists must not survive a session
 * change.
 *
 * Bootstrap behavior on mount:
 *   1. If a token exists, call `/auth/me`.
 *   2. If the call succeeds, populate `user` and become authenticated.
 *   3. If the call fails, remove the token and become unauthenticated.
 *   4. Either way, `isLoading` flips to `false`.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  // Clear local auth state (used by bootstrap failure and the 401 listener).
  const clearSession = useCallback(() => {
    removeToken();
    setUser(null);
    dispatch(resetConnectionState());
  }, [dispatch]);

  // Bootstrap — runs once on mount.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getToken();
      if (!token) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const envelope = await authService.getCurrentUser();
        if (cancelled) return;
        const nextUser = envelope?.data?.user ?? null;
        setUser(nextUser);
      } catch (_err) {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // React to 401s emitted by the Axios interceptor.
  useEffect(() => {
    const unsubscribe = subscribeUnauthorized(() => {
      setUser(null);
      removeToken();
      dispatch(resetConnectionState());
    });
    return unsubscribe;
  }, [dispatch]);

  const login = useCallback(async (credentials) => {
    const envelope = await authService.loginUser(credentials);
    const token = envelope?.data?.token;
    const nextUser = envelope?.data?.user ?? null;
    if (!token) {
      throw new Error('Login response was missing a token.');
    }
    setToken(token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const register = useCallback(async (formValues) => {
    const envelope = await authService.registerUser(formValues);
    const token = envelope?.data?.token;
    const nextUser = envelope?.data?.user ?? null;
    if (!token) {
      throw new Error('Registration response was missing a token.');
    }
    setToken(token);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshCurrentUser = useCallback(async () => {
    try {
      const envelope = await authService.getCurrentUser();
      const nextUser = envelope?.data?.user ?? null;
      setUser(nextUser);
      return nextUser;
    } catch (_err) {
      clearSession();
      return null;
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshCurrentUser,
    }),
    [user, isLoading, login, register, logout, refreshCurrentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return ctx;
}
