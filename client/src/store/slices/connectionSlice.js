import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';

import * as connectionService from '../../services/connectionService.js';

/**
 * NEXORA — connection slice.
 *
 * Owns shared connection / network state on top of the existing
 * AuthContext. Authentication lifecycle stays in AuthContext — this slice
 * is for the data the backend already returns from the connection API:
 *
 *   - per-user semantic status (none | outgoing_pending | incoming_pending | connected)
 *   - the caller's accepted connections
 *   - incoming pending requests targeted at the caller
 *   - outgoing pending requests sent by the caller
 *
 * State is normalized per-userId where it makes sense. Server-side
 * `connection.status` is intentionally NOT exposed — only the semantic
 * status reaches the UI. Connection documents are stored by their server
 * id so list mutations can address them by id.
 *
 * Mutation policy: server-confirmed. Successful mutations dispatch the
 * resulting connection document into the appropriate slice so the UI
 * reflects authoritative state on the next render. No optimistic
 * patching — 409 conflicts are common in connection flows and a stale
 * optimistic state would mislead the caller.
 */

const initialState = {
  // Per-user relationship cache: { [userId]: { status, connectionId? } }
  // When a relationship exists, we also cache the connectionId so the
  // ProfilePage can dispatch a mutation (accept / withdraw / remove)
  // without re-listing.
  statusByUserId: {},

  // Connections the caller has accepted (status: 'accepted' from server).
  // Stored as an array; the controller's ProfilePage reads by partner id.
  connections: [],

  // Incoming pending requests targeted at the caller.
  incoming: [],

  // Outgoing pending requests the caller has sent.
  outgoing: [],

  loading: {
    status: {}, // [userId]: true|false
    connections: false,
    incoming: false,
    outgoing: false,
    mutation: false,
  },

  errors: {
    status: {}, // [userId]: string|null
    connections: null,
    incoming: null,
    outgoing: null,
    mutation: null,
  },
};

function extractErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  if (typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message;
  }
  return fallback;
}

function rejectToMessage(rejectValue, fallback) {
  return extractErrorMessage(rejectValue, fallback);
}

/**
 * Thunks.
 *
 * Each thunk:
 *   - records loading state keyed by the operation (or userId for status)
 *   - on success, writes the result into the slice and clears loading + error
 *   - on failure, writes the error message into the slice and clears loading
 *
 * Mutation thunks dispatch a follow-up reconciliation pass (`fetchStatus`
 * for the affected userId + refetch the relevant list) so the slice
 * reflects authoritative state. No client-side optimistic patches.
 */

export const fetchStatus = createAsyncThunk(
  'connection/fetchStatus',
  async (userId, { rejectWithValue }) => {
    try {
      const envelope = await connectionService.getConnectionStatus(userId);
      return { userId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to load connection status.')
      );
    }
  }
);

export const fetchConnections = createAsyncThunk(
  'connection/fetchConnections',
  async (_, { rejectWithValue }) => {
    try {
      const envelope = await connectionService.getAcceptedConnections();
      return envelope;
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to load your connections.')
      );
    }
  }
);

export const fetchIncoming = createAsyncThunk(
  'connection/fetchIncoming',
  async (_, { rejectWithValue }) => {
    try {
      const envelope = await connectionService.getIncomingRequests();
      return envelope;
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to load incoming requests.')
      );
    }
  }
);

export const fetchOutgoing = createAsyncThunk(
  'connection/fetchOutgoing',
  async (_, { rejectWithValue }) => {
    try {
      const envelope = await connectionService.getOutgoingRequests();
      return envelope;
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to load outgoing requests.')
      );
    }
  }
);

/**
 * Mutation thunks return the new connection document on success so we can
 * dispatch a follow-up fetchStatus + list refresh.
 */

export const sendRequest = createAsyncThunk(
  'connection/sendRequest',
  async (targetUserId, { rejectWithValue }) => {
    try {
      const envelope =
        await connectionService.sendConnectionRequest(targetUserId);
      return { targetUserId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to send the connection request.')
      );
    }
  }
);

export const acceptRequest = createAsyncThunk(
  'connection/acceptRequest',
  async (connectionId, { rejectWithValue }) => {
    try {
      const envelope =
        await connectionService.acceptConnectionRequest(connectionId);
      return envelope;
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to accept the request.')
      );
    }
  }
);

export const rejectRequest = createAsyncThunk(
  'connection/rejectRequest',
  async (connectionId, { rejectWithValue }) => {
    try {
      const envelope =
        await connectionService.rejectConnectionRequest(connectionId);
      return envelope;
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to reject the request.')
      );
    }
  }
);

export const withdrawRequest = createAsyncThunk(
  'connection/withdrawRequest',
  async (connectionId, { rejectWithValue }) => {
    try {
      const envelope =
        await connectionService.withdrawConnectionRequest(connectionId);
      return envelope;
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to withdraw the request.')
      );
    }
  }
);

export const removeConnectionAction = createAsyncThunk(
  'connection/removeConnection',
  async (connectionId, { rejectWithValue }) => {
    try {
      const envelope = await connectionService.removeConnection(connectionId);
      return { connectionId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        rejectToMessage(err, 'Unable to remove the connection.')
      );
    }
  }
);

const slice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    /**
     * Clear status cache for a user (e.g. after logout).
     */
    clearStatusFor(state, action) {
      const userId = action.payload;
      if (userId && state.statusByUserId[userId] !== undefined) {
        delete state.statusByUserId[userId];
      }
      if (userId && state.loading.status[userId] !== undefined) {
        delete state.loading.status[userId];
      }
      if (userId && state.errors.status[userId] !== undefined) {
        delete state.errors.status[userId];
      }
    },
    /**
     * Wipe the entire slice — used on logout.
     */
    resetConnectionState() {
      return initialState;
    },
    /**
     * Clear the latest mutation error so the UI doesn't show a stale banner.
     */
    clearMutationError(state) {
      state.errors.mutation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchStatus
      .addCase(fetchStatus.pending, (state, action) => {
        const userId = action.meta.arg;
        state.loading.status[userId] = true;
        state.errors.status[userId] = null;
      })
      .addCase(fetchStatus.fulfilled, (state, action) => {
        const { userId, payload } = action.payload;
        const data = payload?.data ?? {};
        const status = data.status ?? 'none';
        const connectionId = data.connection?.id ?? null;
        state.statusByUserId[userId] = { status, connectionId };
        state.loading.status[userId] = false;
        state.errors.status[userId] = null;
      })
      .addCase(fetchStatus.rejected, (state, action) => {
        const userId = action.meta.arg;
        state.loading.status[userId] = false;
        state.errors.status[userId] =
          action.payload || 'Unable to load connection status.';
      })

      // fetchConnections
      .addCase(fetchConnections.pending, (state) => {
        state.loading.connections = true;
        state.errors.connections = null;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.loading.connections = false;
        state.connections = action.payload?.data?.connections ?? [];
        state.errors.connections = null;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading.connections = false;
        state.connections = [];
        state.errors.connections =
          action.payload || 'Unable to load your connections.';
      })

      // fetchIncoming
      .addCase(fetchIncoming.pending, (state) => {
        state.loading.incoming = true;
        state.errors.incoming = null;
      })
      .addCase(fetchIncoming.fulfilled, (state, action) => {
        state.loading.incoming = false;
        state.incoming = action.payload?.data?.connections ?? [];
        state.errors.incoming = null;
      })
      .addCase(fetchIncoming.rejected, (state, action) => {
        state.loading.incoming = false;
        state.incoming = [];
        state.errors.incoming =
          action.payload || 'Unable to load incoming requests.';
      })

      // fetchOutgoing
      .addCase(fetchOutgoing.pending, (state) => {
        state.loading.outgoing = true;
        state.errors.outgoing = null;
      })
      .addCase(fetchOutgoing.fulfilled, (state, action) => {
        state.loading.outgoing = false;
        state.outgoing = action.payload?.data?.connections ?? [];
        state.errors.outgoing = null;
      })
      .addCase(fetchOutgoing.rejected, (state, action) => {
        state.loading.outgoing = false;
        state.outgoing = [];
        state.errors.outgoing =
          action.payload || 'Unable to load outgoing requests.';
      })

      // Mutation thunks share the mutation loading flag.
      .addMatcher(
        (action) =>
          typeof action.type === 'string' &&
          action.type.startsWith('connection/') &&
          action.type.endsWith('/pending') &&
          /^(sendRequest|acceptRequest|rejectRequest|withdrawRequest|removeConnection)$/.test(
            action.type.split('/')[1]
          ),
        (state) => {
          state.loading.mutation = true;
          state.errors.mutation = null;
        }
      )
      .addMatcher(
        (action) =>
          typeof action.type === 'string' &&
          action.type.endsWith('/fulfilled') &&
          /^(sendRequest|acceptRequest|rejectRequest|withdrawRequest|removeConnection)$/.test(
            action.type.split('/')[1]
          ),
        (state) => {
          state.loading.mutation = false;
          state.errors.mutation = null;
        }
      )
      .addMatcher(
        (action) =>
          typeof action.type === 'string' &&
          action.type.endsWith('/rejected') &&
          /^(sendRequest|acceptRequest|rejectRequest|withdrawRequest|removeConnection)$/.test(
            action.type.split('/')[1]
          ),
        (state, action) => {
          state.loading.mutation = false;
          state.errors.mutation = action.payload || 'Connection action failed.';
        }
      );
  },
});

export const { clearStatusFor, resetConnectionState, clearMutationError } =
  slice.actions;

export default slice.reducer;

/**
 * Selectors.
 *
 * Components consume these instead of reaching into the raw state shape.
 * They memoize so re-renders don't re-derive unless the underlying data
 * actually changes.
 */

const selectConnectionState = (state) => state.connection;

export const selectConnectionStatus = (userId) =>
  createSelector(
    [selectConnectionState, () => userId],
    (conn, id) => conn.statusByUserId[id] ?? null
  );

export function selectConnectionRelationship(userId) {
  return createSelector(
    [selectConnectionState, () => userId],
    (conn, id) =>
      conn.statusByUserId[id] ?? { status: null, connectionId: null }
  );
}

export function selectIsStatusLoading(userId) {
  return createSelector([selectConnectionState, () => userId], (conn, id) =>
    Boolean(conn.loading.status[id])
  );
}

export function selectStatusError(userId) {
  return createSelector(
    [selectConnectionState, () => userId],
    (conn, id) => conn.errors.status[id] ?? null
  );
}

export const selectAcceptedConnections = createSelector(
  [selectConnectionState],
  (conn) => conn.connections
);

export const selectIncomingRequests = createSelector(
  [selectConnectionState],
  (conn) => conn.incoming
);

export const selectOutgoingRequests = createSelector(
  [selectConnectionState],
  (conn) => conn.outgoing
);

export const selectConnectionsLoading = createSelector(
  [selectConnectionState],
  (conn) => conn.loading.connections
);

export const selectIncomingLoading = createSelector(
  [selectConnectionState],
  (conn) => conn.loading.incoming
);

export const selectOutgoingLoading = createSelector(
  [selectConnectionState],
  (conn) => conn.loading.outgoing
);

export const selectMutationLoading = createSelector(
  [selectConnectionState],
  (conn) => conn.loading.mutation
);

export const selectMutationError = createSelector(
  [selectConnectionState],
  (conn) => conn.errors.mutation
);

export const selectConnectionsError = createSelector(
  [selectConnectionState],
  (conn) => conn.errors.connections
);

export const selectIncomingError = createSelector(
  [selectConnectionState],
  (conn) => conn.errors.incoming
);

export const selectOutgoingError = createSelector(
  [selectConnectionState],
  (conn) => conn.errors.outgoing
);
