/**
 * Shared constants.
 *
 * Only environment-derived values live here. Hardcoded copy or feature
 * constants should live next to the code that uses them.
 */

const fromEnv = import.meta.env.VITE_API_BASE_URL;

// Sensible dev default points at the local Express server on :5000.
// Vite's dev proxy could replace this in a future phase.
export const API_BASE_URL = fromEnv || 'http://localhost:5000/api/v1';
export const APP_NAME = 'NEXORA';
export const APP_TAGLINE = 'Professional Networking Platform';
