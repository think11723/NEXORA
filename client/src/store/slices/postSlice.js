import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';

import * as postService from '../../services/postService.js';

/**
 * NEXORA — post slice.
 *
 * Owns shared / server-derived Post state. NOT every UI concern lives
 * here — the boundary is explicit:
 *
 *   In Redux (this slice):
 *     - feed (server-paginated list of posts + pagination block)
 *     - myPosts (server-paginated list of the caller's posts)
 *     - mutation flags (create / update / delete) — needed for
 *       disabling buttons + showing progress + surfacing errors across
 *       multiple components
 *
 *   Local to each component (NOT in Redux):
 *     - composer textarea content while typing
 *     - modal / dialog open/close state
 *     - dropdown / menu open/close state
 *     - hover / focus / animation state
 *     - local form drafts (edit modal text)
 *
 *   The above split keeps the Redux store lean and prevents transient
 *   UI state from causing re-renders across the tree.
 *
 * State shape:
 *
 *   {
 *     feed:    { posts: [], pagination, loading, error },
 *     myPosts: { posts: [], pagination, loading, error },
 *     userPostsByUserId: {
 *       [userId]: { posts: [], pagination, loading, error }
 *     },
 *     mutations: {
 *       create: { loading, error, lastCreatedId? },
 *       update: { loadingById: { [postId]: bool }, errorById },
 *       delete: { loadingById: { [postId]: bool }, errorById }
 *     }
 *   }
 */

const initialState = {
  feed: {
    posts: [],
    pagination: null,
    loading: false,
    error: null,
  },
  myPosts: {
    posts: [],
    pagination: null,
    loading: false,
    error: null,
  },
  userPostsByUserId: {},
  mutations: {
    create: { loading: false, error: null },
    update: { loadingById: {}, errorById: {} },
    delete: { loadingById: {}, errorById: {} },
  },
};

function extractErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  if (typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchFeed = createAsyncThunk(
  'post/fetchFeed',
  async (
    { page = 1, limit = 20, append = false } = {},
    { rejectWithValue }
  ) => {
    try {
      const envelope = await postService.getFeed(page, limit);
      return { page, limit, append, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to load your feed.')
      );
    }
  }
);

export const fetchMyPosts = createAsyncThunk(
  'post/fetchMyPosts',
  async (
    { page = 1, limit = 20, append = false } = {},
    { rejectWithValue }
  ) => {
    try {
      const envelope = await postService.getMyPosts(page, limit);
      return { page, limit, append, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to load your posts.')
      );
    }
  }
);

export const fetchUserPosts = createAsyncThunk(
  'post/fetchUserPosts',
  async ({ userId, page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const envelope = await postService.getUserPosts(userId, page, limit);
      return { userId, page, limit, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to load user posts.')
      );
    }
  }
);

export const fetchPost = createAsyncThunk(
  'post/fetchPost',
  async (postId, { rejectWithValue }) => {
    try {
      const envelope = await postService.getPost(postId);
      return envelope;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to load this post.')
      );
    }
  }
);

export const createPostThunk = createAsyncThunk(
  'post/create',
  async (content, { rejectWithValue }) => {
    try {
      const envelope = await postService.createPost(content);
      return envelope;
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to create the post.')
      );
    }
  }
);

export const updatePostThunk = createAsyncThunk(
  'post/update',
  async ({ postId, content }, { rejectWithValue }) => {
    try {
      const envelope = await postService.updatePost(postId, content);
      return { postId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to update the post.')
      );
    }
  }
);

export const deletePostThunk = createAsyncThunk(
  'post/delete',
  async (postId, { rejectWithValue }) => {
    try {
      const envelope = await postService.deletePost(postId);
      return { postId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to delete the post.')
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const slice = createSlice({
  name: 'post',
  initialState,
  reducers: {
    resetPostState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- feed ---
      .addCase(fetchFeed.pending, (state) => {
        state.feed.loading = true;
        state.feed.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        const { page, append, payload } = action.payload;
        const posts = payload?.data?.posts ?? [];
        const pagination = payload?.data?.pagination ?? null;
        state.feed.posts = append ? [...state.feed.posts, ...posts] : posts;
        state.feed.pagination = pagination;
        state.feed.loading = false;
        state.feed.error = null;
        // Track page in pagination metadata — already returned by server.
        void page;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.feed.loading = false;
        state.feed.error = action.payload || 'Unable to load your feed.';
      })

      // --- myPosts ---
      .addCase(fetchMyPosts.pending, (state) => {
        state.myPosts.loading = true;
        state.myPosts.error = null;
      })
      .addCase(fetchMyPosts.fulfilled, (state, action) => {
        const { append, payload } = action.payload;
        const posts = payload?.data?.posts ?? [];
        const pagination = payload?.data?.pagination ?? null;
        state.myPosts.posts = append
          ? [...state.myPosts.posts, ...posts]
          : posts;
        state.myPosts.pagination = pagination;
        state.myPosts.loading = false;
        state.myPosts.error = null;
      })
      .addCase(fetchMyPosts.rejected, (state, action) => {
        state.myPosts.loading = false;
        state.myPosts.error = action.payload || 'Unable to load your posts.';
      })

      // --- userPostsByUserId ---
      .addCase(fetchUserPosts.pending, (state, action) => {
        const { userId } = action.meta.arg || {};
        if (!userId) return;
        state.userPostsByUserId[userId] ??= {
          posts: [],
          pagination: null,
          loading: false,
          error: null,
        };
        state.userPostsByUserId[userId].loading = true;
        state.userPostsByUserId[userId].error = null;
      })
      .addCase(fetchUserPosts.fulfilled, (state, action) => {
        const { userId, payload } = action.payload;
        const posts = payload?.data?.posts ?? [];
        const pagination = payload?.data?.pagination ?? null;
        state.userPostsByUserId[userId] = {
          posts,
          pagination,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        const { userId } = action.payload
          ? { userId: action.meta.arg?.userId }
          : { userId: action.meta.arg?.userId };
        if (!userId) return;
        state.userPostsByUserId[userId] ??= {
          posts: [],
          pagination: null,
          loading: false,
          error: null,
        };
        state.userPostsByUserId[userId].loading = false;
        state.userPostsByUserId[userId].error =
          action.payload || 'Unable to load user posts.';
      })

      // --- create ---
      .addCase(createPostThunk.pending, (state) => {
        state.mutations.create.loading = true;
        state.mutations.create.error = null;
      })
      .addCase(createPostThunk.fulfilled, (state, action) => {
        state.mutations.create.loading = false;
        state.mutations.create.error = null;
        const newPost = action.payload?.data?.post;
        if (newPost) {
          // Prepend to feed so the user sees their post immediately.
          state.feed.posts = [
            newPost,
            ...state.feed.posts.filter((p) => p && p.id !== newPost.id),
          ];
          // Prepend to myPosts if it has been loaded.
          state.myPosts.posts = [
            newPost,
            ...state.myPosts.posts.filter((p) => p && p.id !== newPost.id),
          ];
        }
      })
      .addCase(createPostThunk.rejected, (state, action) => {
        state.mutations.create.loading = false;
        state.mutations.create.error =
          action.payload || 'Unable to create the post.';
      })

      // --- update ---
      .addCase(updatePostThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        state.mutations.update.loadingById[postId] = true;
        state.mutations.update.errorById[postId] = null;
      })
      .addCase(updatePostThunk.fulfilled, (state, action) => {
        const { postId, payload } = action.payload;
        state.mutations.update.loadingById[postId] = false;
        state.mutations.update.errorById[postId] = null;
        const updated = payload?.data?.post;
        if (updated) {
          // Replace in feed
          state.feed.posts = state.feed.posts.map((p) =>
            p && p.id === postId ? updated : p
          );
          // Replace in myPosts
          state.myPosts.posts = state.myPosts.posts.map((p) =>
            p && p.id === postId ? updated : p
          );
          // Replace in userPostsByUserId (any user id)
          for (const userId of Object.keys(state.userPostsByUserId)) {
            state.userPostsByUserId[userId].posts = state.userPostsByUserId[
              userId
            ].posts.map((p) => (p && p.id === postId ? updated : p));
          }
        }
      })
      .addCase(updatePostThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        state.mutations.update.loadingById[postId] = false;
        state.mutations.update.errorById[postId] =
          action.payload || 'Unable to update the post.';
      })

      // --- delete ---
      .addCase(deletePostThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        state.mutations.delete.loadingById[postId] = true;
        state.mutations.delete.errorById[postId] = null;
      })
      .addCase(deletePostThunk.fulfilled, (state, action) => {
        const { postId } = action.payload;
        state.mutations.delete.loadingById[postId] = false;
        state.mutations.delete.errorById[postId] = null;
        // Remove from every list
        state.feed.posts = state.feed.posts.filter((p) => p && p.id !== postId);
        state.myPosts.posts = state.myPosts.posts.filter(
          (p) => p && p.id !== postId
        );
        for (const userId of Object.keys(state.userPostsByUserId)) {
          state.userPostsByUserId[userId].posts = state.userPostsByUserId[
            userId
          ].posts.filter((p) => p && p.id !== postId);
        }
      })
      .addCase(deletePostThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        state.mutations.delete.loadingById[postId] = false;
        state.mutations.delete.errorById[postId] =
          action.payload || 'Unable to delete the post.';
      });
  },
});

export const { resetPostState } = slice.actions;
export default slice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectPostState = (state) => state.post;

export const selectFeedPosts = createSelector(
  [selectPostState],
  (p) => p.feed.posts
);

export const selectFeedPagination = createSelector(
  [selectPostState],
  (p) => p.feed.pagination
);

export const selectFeedLoading = createSelector(
  [selectPostState],
  (p) => p.feed.loading
);

export const selectFeedError = createSelector(
  [selectPostState],
  (p) => p.feed.error
);

export const selectMyPosts = createSelector(
  [selectPostState],
  (p) => p.myPosts.posts
);

export const selectMyPostsPagination = createSelector(
  [selectPostState],
  (p) => p.myPosts.pagination
);

export const selectMyPostsLoading = createSelector(
  [selectPostState],
  (p) => p.myPosts.loading
);

export const selectMyPostsError = createSelector(
  [selectPostState],
  (p) => p.myPosts.error
);

export const selectUserPosts = (userId) =>
  createSelector(
    [selectPostState, () => userId],
    (p, id) => p.userPostsByUserId[id] ?? null
  );

export const selectCreateMutationState = createSelector(
  [selectPostState],
  (p) => ({
    loading: p.mutations.create.loading,
    error: p.mutations.create.error,
  })
);

export const selectUpdateMutationState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.update.loadingById[id]),
    error: p.mutations.update.errorById[id] ?? null,
  }));

export const selectDeleteMutationState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.delete.loadingById[id]),
    error: p.mutations.delete.errorById[id] ?? null,
  }));
