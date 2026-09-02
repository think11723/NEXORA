/**
 * NEXORA — JWT persistence.
 *
 * Single point of contact for the access token. Components, contexts, and
 * services MUST go through this module — never touch `localStorage` directly.
 *
 * Security note: localStorage is accessible to any JS executing on the page,
 * so this is intentionally XSS-vulnerable. The constitution documents that
 * a future phase may evaluate HttpOnly cookies + refresh tokens.
 */

const STORAGE_KEY = 'nexora_token';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (_err) {
    // Some browsers throw when localStorage is disabled. Treat as absent.
    return null;
  }
}

export function getToken() {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(STORAGE_KEY);
}

export function setToken(token) {
  const storage = getStorage();
  if (!storage) return;
  if (typeof token !== 'string') return;
  const trimmed = token.trim();
  if (trimmed.length === 0) return;
  storage.setItem(STORAGE_KEY, trimmed);
}

export function removeToken() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}

export function hasToken() {
  return Boolean(getToken());
}

export const AUTH_TOKEN_KEY = STORAGE_KEY;
