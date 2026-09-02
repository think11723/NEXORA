import apiClient from './api.js';

/**
 * NEXORA — authentication service.
 *
 * Thin HTTP wrapper around the backend auth endpoints. Pages and contexts
 * call these functions instead of building raw Axios requests. Every
 * function returns the unwrapped `data` envelope (`{ success, message, data }`)
 * so callers can read `data.token` / `data.user` directly.
 */

function unwrap(response) {
  return response.data;
}

export async function registerUser(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const body = {
    firstName: source.firstName,
    lastName: source.lastName,
    email: source.email,
    password: source.password,
  };
  const response = await apiClient.post('/auth/register', body);
  return unwrap(response);
}

export async function loginUser(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const body = {
    email: source.email,
    password: source.password,
  };
  const response = await apiClient.post('/auth/login', body);
  return unwrap(response);
}

export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return unwrap(response);
}
