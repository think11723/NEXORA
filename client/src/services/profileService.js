import apiClient from './api.js';

/**
 * NEXORA — profile service.
 *
 * Mirrors the backend profile API. All HTTP goes through the centralized
 * Axios client, so the JWT interceptor handles authentication transparently.
 *
 * The Phase 3 UI work will consume these functions; nothing in the current
 * pages calls them yet.
 */

function unwrap(response) {
  return response.data;
}

export async function getMyProfile() {
  const response = await apiClient.get('/profile/me');
  return unwrap(response);
}

export async function updateMyProfile(payload) {
  const response = await apiClient.patch('/profile/me', payload);
  return unwrap(response);
}

export async function getProfileByUserId(userId) {
  const response = await apiClient.get(`/profile/${userId}`);
  return unwrap(response);
}
