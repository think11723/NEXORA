import axios from 'axios';

import { API_BASE_URL } from '../constants';
import { getToken } from '../utils/authStorage';
import { emitUnauthorized } from '../utils/authEvents';

/**
 * Centralized Axios instance.
 *
 * All HTTP traffic in the app goes through this client. The request
 * interceptor attaches the JWT (when present) without any caller having
 * to know about it. The response interceptor normalizes the API envelope
 * and signals `unauthorized` when the backend rejects the token, so the
 * AuthContext can clear local state.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
});

// Request interceptor — attaches Bearer token when one is persisted.
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      // Headers may be undefined when callers pass a string URL.
      const headers = config.headers ?? {};
      headers.Authorization = `Bearer ${token}`;
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — surfaces a clean envelope and signals
// unauthorized responses so AuthContext can react.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Token rejected by the backend — let the auth layer clean up.
      emitUnauthorized();
    }

    const payload = error?.response?.data || {
      success: false,
      message: 'Unable to connect to NEXORA. Please try again.',
    };
    return Promise.reject(payload);
  }
);

export default apiClient;
