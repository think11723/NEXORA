import { configureStore } from '@reduxjs/toolkit';

import connectionReducer from './slices/connectionSlice.js';
import postReducer from './slices/postSlice.js';

/**
 * NEXORA — Redux store.
 *
 * Slices:
 *   - connection  → shared network / connection state (Phase 4)
 *   - post        → shared feed / post / pagination state (Phase 5)
 *
 * The `post` slice is intentionally separated from `connection` so the
 * two domains can evolve independently. Cross-domain reads (e.g. a
 * post author profile) use the backend's safe serializer rather than
 * client-side joins.
 */
export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    post: postReducer,
  },
});
