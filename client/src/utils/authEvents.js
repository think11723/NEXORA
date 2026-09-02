/**
 * NEXORA — auth event bus.
 *
 * Breaks the circular dependency between the Axios client (which can
 * observe 401 responses) and the AuthContext (which owns the resulting
 * state change). The Axios interceptor emits `unauthorized`; the
 * AuthContext subscribes and clears local auth state.
 *
 * No business logic lives here — this module is a thin pub/sub.
 */

const UNAUTHORIZED_EVENT = 'nexora:auth:unauthorized';
const subscribers = new Set();

export function subscribeUnauthorized(handler) {
  if (typeof handler !== 'function') return () => {};
  subscribers.add(handler);
  return function unsubscribe() {
    subscribers.delete(handler);
  };
}

export function emitUnauthorized() {
  for (const handler of subscribers) {
    try {
      handler();
    } catch (_err) {
      // A failing subscriber must not block the others.
    }
  }
}

export const AUTH_EVENTS = Object.freeze({
  UNAUTHORIZED: UNAUTHORIZED_EVENT,
});
