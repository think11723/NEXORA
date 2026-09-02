import apiClient from './api.js';

/**
 * NEXORA — connection service.
 *
 * Thin HTTP wrapper around the backend connection API. All traffic goes
 * through the existing centralized Axios client so the JWT request
 * interceptor and the unauthorized-event bridge both apply transparently.
 *
 * Functions return `response.data` (the full envelope). Callers — usually
 * Redux thunks — read `envelope.data` for the payload and `envelope.data`
 * is shaped by the backend per the Phase 4 Prompt 1 contract:
 *
 *   GET /api/v1/connections/status/:userId
 *     → { success, message, data: { status, targetUserId, connection? } }
 *
 *   GET /api/v1/connections  (and /incoming, /outgoing)
 *     → { success, message, data: { connections: [...] } }
 *
 *   POST /api/v1/connections/:userId/request
 *     → { success, message, data: { connection } }   (201)
 *
 *   POST /api/v1/connections/:connectionId/{accept|reject|withdraw}
 *     → { success, message, data: { connection } }   (200)
 *
 *   DELETE /api/v1/connections/:connectionId
 *     → { success, message, data: { removed: true, id } }   (200)
 */

function unwrap(response) {
  return response.data;
}

export async function getConnectionStatus(userId) {
  const response = await apiClient.get(`/connections/status/${userId}`);
  return unwrap(response);
}

export async function getAcceptedConnections() {
  const response = await apiClient.get('/connections');
  return unwrap(response);
}

export async function getIncomingRequests() {
  const response = await apiClient.get('/connections/incoming');
  return unwrap(response);
}

export async function getOutgoingRequests() {
  const response = await apiClient.get('/connections/outgoing');
  return unwrap(response);
}

export async function sendConnectionRequest(userId) {
  const response = await apiClient.post(`/connections/${userId}/request`);
  return unwrap(response);
}

export async function acceptConnectionRequest(connectionId) {
  const response = await apiClient.post(`/connections/${connectionId}/accept`);
  return unwrap(response);
}

export async function rejectConnectionRequest(connectionId) {
  const response = await apiClient.post(`/connections/${connectionId}/reject`);
  return unwrap(response);
}

export async function withdrawConnectionRequest(connectionId) {
  const response = await apiClient.post(
    `/connections/${connectionId}/withdraw`
  );
  return unwrap(response);
}

export async function removeConnection(connectionId) {
  const response = await apiClient.delete(`/connections/${connectionId}`);
  return unwrap(response);
}
