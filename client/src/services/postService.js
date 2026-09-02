import apiClient from './api.js';

/**
 * NEXORA — post service.
 *
 * Thin HTTP wrapper around the backend post endpoints. Every call goes
 * through the existing centralized Axios instance so the JWT interceptor
 * and 401-event bridge apply transparently.
 *
 * Functions return `response.data` (the full envelope). Callers —
 * usually the postSlice thunks — read `envelope.data` for the payload
 * and `envelope.data.pagination` for pagination metadata on list
 * responses.
 *
 * Errors come back as the same envelope shape via the Axios response
 * interceptor; thunks extract `payload.message` for user-facing errors.
 */

function unwrap(response) {
  return response.data;
}

function clampPagination({ page, limit } = {}) {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  return { page: safePage, limit: safeLimit };
}

function paginationQuery({ page, limit } = {}) {
  const { page: p, limit: l } = clampPagination({ page, limit });
  return { page: p, limit: l };
}

export async function getFeed(page, limit) {
  const response = await apiClient.get('/posts/feed', {
    params: paginationQuery({ page, limit }),
  });
  return unwrap(response);
}

export async function getMyPosts(page, limit) {
  const response = await apiClient.get('/posts/me', {
    params: paginationQuery({ page, limit }),
  });
  return unwrap(response);
}

export async function getUserPosts(userId, page, limit) {
  const response = await apiClient.get(`/posts/user/${userId}`, {
    params: paginationQuery({ page, limit }),
  });
  return unwrap(response);
}

export async function getPost(postId) {
  const response = await apiClient.get(`/posts/${postId}`);
  return unwrap(response);
}

export async function createPost(content) {
  const response = await apiClient.post('/posts', { content });
  return unwrap(response);
}

export async function updatePost(postId, content) {
  const response = await apiClient.patch(`/posts/${postId}`, { content });
  return unwrap(response);
}

export async function deletePost(postId) {
  const response = await apiClient.delete(`/posts/${postId}`);
  return unwrap(response);
}
