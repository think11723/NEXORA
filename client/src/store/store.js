import { configureStore } from '@reduxjs/toolkit';

import connectionReducer from './slices/connectionSlice.js';

/**
 * NEXORA — Redux store.
 *
 * One slice today: `connection` (see slices/connectionSlice.js). The
 * store is configured with the standard Redux Toolkit defaults plus a
 * tiny serializableCheck tweak: our Axios response interceptor puts the
 * raw payload on `rejected` actions via rejectWithValue, which RTK's
 * default serializable check treats as fine. Nothing exotic here.
 */
export const store = configureStore({
  reducer: {
    connection: connectionReducer,
  },
  // Default middleware (thunk + serializable + immutable) is sufficient.
});
