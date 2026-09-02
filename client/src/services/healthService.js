import apiClient from './api.js';

/**
 * Health service.
 *
 * Isolated HTTP call behind a named function so future pages don't
 * construct raw Axios requests.
 */
export async function fetchHealth() {
  const { data } = await apiClient.get('/health');
  return data;
}
