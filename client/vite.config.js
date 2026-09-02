import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite + React + Tailwind v4 (via the @tailwindcss/vite plugin).
 * Tailwind v4 is a single CSS import — see `client/src/styles/global.css`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
