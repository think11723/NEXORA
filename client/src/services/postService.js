import apiClient from './api.js';

/**
 * NEXORA — post service (client).
 *
 * Thin HTTP wrapper around the existing backend post endpoints,
 * extended in Phase 5 Prompt 3 to cover reactions and comments.
 *
 * Functions return `response.data` (the full envelope). Callers —
 * usually the postSlice thunks — read `envelope.data` for the payload
 * and `envelope.data.pagination` for pagination metadata on list
 * responses.
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

// ---------------------------------------------------------------------------
// Reactions (Phase 5 Prompt 3)
// ---------------------------------------------------------------------------

export async function likePost(postId) {
  const response = await apiClient.post(`/posts/${postId}/reactions`);
  return unwrap(response);
}

export async function unlikePost(postId) {
  const response = await apiClient.delete(`/posts/${postId}/reactions`);
  return unwrap(response);
}

export async function getReactionSummary(postId) {
  const response = await apiClient.get(`/posts/${postId}/reactions`);
  return unwrap(response);
}

// ---------------------------------------------------------------------------
// Comments (Phase 5 Prompt 3)
// ---------------------------------------------------------------------------

export async function listComments(postId, page, limit) {
  const response = await apiClient.get(`/posts/${postId}/comments`, {
    params: paginationQuery({ page, limit }),
  });
  return unwrap(response);
}

export async function createComment(postId, content) {
  const response = await apiClient.post(`/posts/${postId}/comments`, {
    content,
  });
  return unwrap(response);
}

export async function updateComment(commentId, content) {
  const response = await apiClient.patch(`/comments/${commentId}`, { content });
  return unwrap(response);
}

export async function deleteComment(commentId) {
  const response = await apiClient.delete(`/comments/${commentId}`);
  return unwrap(response);
}
