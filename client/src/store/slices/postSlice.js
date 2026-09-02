import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from '@reduxjs/toolkit';

import * as postService from '../../services/postService.js';

/**
 * NEXORA — post slice.
 *
 * Owns shared / server-derived Post state plus the interaction
 * (reactions + comments) layer added in Phase 5 Prompt 3. The boundary
 * is explicit:
 *
 *   In Redux (this slice):
 *     - feed (server-paginated list of posts + pagination block)
 *     - myPosts, userPostsByUserId (paginated lists + interactions)
 *     - interactions.byPostId  (cached per-post reaction summary)
 *     - comments.byPostId      (cached per-post comment list + pagination)
 *     - mutations: create / update / delete (post + comment + reaction
 *       flags) — needed for disabling buttons, showing progress, and
 *       surfacing errors across multiple components.
 *
 *   Local to each component (NOT in Redux):
 *     - composer textarea content while typing
 *     - comment composer draft
 *     - modal / dialog open/close state
 *     - dropdown / menu state
 *     - hover / focus / animation state
 *     - local edit-comment drafts
 *
 *   The above split keeps the Redux store lean and prevents transient
 *   UI state from causing re-renders across the tree.
 *
 * State shape:
 *
 *   {
 *     feed:    { posts: [], pagination, loading, error },
 *     myPosts: { posts: [], pagination, loading, error },
 *     userPostsByUserId: { [userId]: { posts, pagination, loading, error } },
 *     interactions: { byPostId: { [postId]: { likeCount, likedByMe, commentCount } } },
 *     comments: {
 *       byPostId: {
 *         [postId]: { comments, pagination, loading, error, expanded }
 *       }
 *     },
 *     mutations: {
 *       create:       { loading, error, lastCreatedId? },
 *       update:       { loadingById, errorById },
 *       delete:       { loadingById, errorById },
 *       like:         { loadingById, errorById },
 *       createComment:{ loadingById, errorById },
 *       updateComment:{ loadingById, errorById },
 *       deleteComment:{ loadingById, errorById }
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
  interactions: {
    byPostId: {},
  },
  comments: {
    byPostId: {},
  },
  mutations: {
    create: { loading: false, error: null },
    update: { loadingById: {}, errorById: {} },
    delete: { loadingById: {}, errorById: {} },
    like: { loadingById: {}, errorById: {} },
    createComment: { loadingById: {}, errorById: {} },
    updateComment: { loadingById: {}, errorById: {} },
    deleteComment: { loadingById: {}, errorById: {} },
  },
};

const DEFAULT_INTERACTION = Object.freeze({
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
});

function extractErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  if (typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message;
  }
  return fallback;
}

function normalizeInteraction(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_INTERACTION };
  return {
    likeCount: Number.isFinite(raw.likeCount) ? raw.likeCount : 0,
    likedByMe: Boolean(raw.likedByMe),
    commentCount: Number.isFinite(raw.commentCount) ? raw.commentCount : 0,
  };
}

// ---------------------------------------------------------------------------
// Thunks — post lifecycle
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
// Thunks — interactions (Phase 5 Prompt 3)
// ---------------------------------------------------------------------------

/**
 * Like a post. Server-confirmed: the backend returns the interaction
 * block on success; we read it and merge into our cached map.
 * The brief allows optimistic updates but the safer path is to wait
 * for the server's authoritative count.
 */
export const likePostThunk = createAsyncThunk(
  'post/like',
  async (postId, { rejectWithValue }) => {
    try {
      const envelope = await postService.likePost(postId);
      return { postId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to like the post.')
      );
    }
  }
);

export const unlikePostThunk = createAsyncThunk(
  'post/unlike',
  async (postId, { rejectWithValue }) => {
    try {
      const envelope = await postService.unlikePost(postId);
      return { postId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to unlike the post.')
      );
    }
  }
);

/**
 * Fetch the interaction summary for a single post. Used when the
 * cached value is missing (e.g. deep-linking to a post).
 */
export const fetchReactionSummary = createAsyncThunk(
  'post/fetchReactionSummary',
  async (postId, { rejectWithValue }) => {
    try {
      const envelope = await postService.getReactionSummary(postId);
      return { postId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to load reaction summary.')
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Thunks — comments (Phase 5 Prompt 3)
// ---------------------------------------------------------------------------

export const fetchComments = createAsyncThunk(
  'post/fetchComments',
  async (
    { postId, page = 1, limit = 20, append = false } = {},
    { rejectWithValue }
  ) => {
    try {
      const envelope = await postService.listComments(postId, page, limit);
      return { postId, page, limit, append, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to load comments.')
      );
    }
  }
);

export const createCommentThunk = createAsyncThunk(
  'post/createComment',
  async ({ postId, content }, { rejectWithValue }) => {
    try {
      const envelope = await postService.createComment(postId, content);
      return { postId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to create the comment.')
      );
    }
  }
);

export const updateCommentThunk = createAsyncThunk(
  'post/updateComment',
  async ({ commentId, content }, { rejectWithValue }) => {
    try {
      const envelope = await postService.updateComment(commentId, content);
      return { commentId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to update the comment.')
      );
    }
  }
);

export const deleteCommentThunk = createAsyncThunk(
  'post/deleteComment',
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      const envelope = await postService.deleteComment(commentId);
      return { postId, commentId, payload: envelope };
    } catch (err) {
      return rejectWithValue(
        extractErrorMessage(err, 'Unable to delete the comment.')
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInteraction(state, postId) {
  return state.interactions.byPostId[postId] ?? { ...DEFAULT_INTERACTION };
}

function getCommentState(state, postId) {
  return state.comments.byPostId[postId] ?? null;
}

function setCommentState(state, postId) {
  if (!state.comments.byPostId[postId]) {
    state.comments.byPostId[postId] = {
      comments: [],
      pagination: null,
      loading: false,
      error: null,
      expanded: false,
    };
  }
  return state.comments.byPostId[postId];
}

function setMutationFlag(state, key, id, isLoading, error) {
  if (isLoading) {
    state.mutations[key].loadingById[id] = true;
    state.mutations[key].errorById[id] = null;
  } else if (error !== undefined) {
    state.mutations[key].loadingById[id] = false;
    state.mutations[key].errorById[id] = error;
  } else {
    state.mutations[key].loadingById[id] = false;
    state.mutations[key].errorById[id] = null;
  }
}

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
    clearMutationError(state, action) {
      const key = action.payload;
      if (key && state.mutations[key]) {
        state.mutations[key].error = null;
      }
    },
    toggleCommentsExpanded(state, action) {
      const postId = action.payload;
      const existing = getCommentState(state, postId);
      const slot = setCommentState(state, postId);
      slot.expanded = existing ? !existing.expanded : true;
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
        const { append, payload } = action.payload;
        const posts = payload?.data?.posts ?? [];
        const pagination = payload?.data?.pagination ?? null;
        const interactionSummaries =
          payload?.data?.interactionSummaries ?? null;
        state.feed.posts = append ? [...state.feed.posts, ...posts] : posts;
        state.feed.pagination = pagination;
        state.feed.loading = false;
        state.feed.error = null;
        if (interactionSummaries) {
          mergeInteractions(state, interactionSummaries);
        }
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
        const interactionSummaries =
          payload?.data?.interactionSummaries ?? null;
        state.myPosts.posts = append
          ? [...state.myPosts.posts, ...posts]
          : posts;
        state.myPosts.pagination = pagination;
        state.myPosts.loading = false;
        state.myPosts.error = null;
        if (interactionSummaries)
          mergeInteractions(state, interactionSummaries);
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
        const interactionSummaries =
          payload?.data?.interactionSummaries ?? null;
        state.userPostsByUserId[userId] = {
          posts,
          pagination,
          loading: false,
          error: null,
        };
        if (interactionSummaries)
          mergeInteractions(state, interactionSummaries);
      })
      .addCase(fetchUserPosts.rejected, (state, action) => {
        const { userId } = action.meta.arg || {};
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

      // --- create post ---
      .addCase(createPostThunk.pending, (state) => {
        state.mutations.create.loading = true;
        state.mutations.create.error = null;
      })
      .addCase(createPostThunk.fulfilled, (state, action) => {
        state.mutations.create.loading = false;
        state.mutations.create.error = null;
        const newPost = action.payload?.data?.post;
        if (newPost) {
          state.feed.posts = [
            newPost,
            ...state.feed.posts.filter((p) => p && p.id !== newPost.id),
          ];
          state.myPosts.posts = [
            newPost,
            ...state.myPosts.posts.filter((p) => p && p.id !== newPost.id),
          ];
          if (newPost.interaction) {
            state.interactions.byPostId[newPost.id] = {
              ...DEFAULT_INTERACTION,
              ...newPost.interaction,
            };
          }
        }
      })
      .addCase(createPostThunk.rejected, (state, action) => {
        state.mutations.create.loading = false;
        state.mutations.create.error =
          action.payload || 'Unable to create the post.';
      })

      // --- update post ---
      .addCase(updatePostThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(state, 'update', postId, true);
      })
      .addCase(updatePostThunk.fulfilled, (state, action) => {
        const { postId, payload } = action.payload;
        setMutationFlag(state, 'update', postId, false);
        const updated = payload?.data?.post;
        if (updated) {
          state.feed.posts = state.feed.posts.map((p) =>
            p && p.id === postId ? updated : p
          );
          state.myPosts.posts = state.myPosts.posts.map((p) =>
            p && p.id === postId ? updated : p
          );
          for (const userId of Object.keys(state.userPostsByUserId)) {
            state.userPostsByUserId[userId].posts = state.userPostsByUserId[
              userId
            ].posts.map((p) => (p && p.id === postId ? updated : p));
          }
          if (updated.interaction) {
            state.interactions.byPostId[postId] = {
              ...DEFAULT_INTERACTION,
              ...updated.interaction,
            };
          }
        }
      })
      .addCase(updatePostThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(
          state,
          'update',
          postId,
          false,
          action.payload || 'Unable to update the post.'
        );
      })

      // --- delete post ---
      .addCase(deletePostThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(state, 'delete', postId, true);
      })
      .addCase(deletePostThunk.fulfilled, (state, action) => {
        const { postId } = action.payload;
        setMutationFlag(state, 'delete', postId, false);
        state.feed.posts = state.feed.posts.filter((p) => p && p.id !== postId);
        state.myPosts.posts = state.myPosts.posts.filter(
          (p) => p && p.id !== postId
        );
        for (const userId of Object.keys(state.userPostsByUserId)) {
          state.userPostsByUserId[userId].posts = state.userPostsByUserId[
            userId
          ].posts.filter((p) => p && p.id !== postId);
        }
        delete state.interactions.byPostId[postId];
        delete state.comments.byPostId[postId];
      })
      .addCase(deletePostThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(
          state,
          'delete',
          postId,
          false,
          action.payload || 'Unable to delete the post.'
        );
      })

      // --- fetchPost (detail view) ---
      .addCase(fetchPost.fulfilled, (state, action) => {
        const post = action.payload?.data?.post;
        if (!post) return;
        if (post.interaction) {
          state.interactions.byPostId[post.id] = {
            ...DEFAULT_INTERACTION,
            ...post.interaction,
          };
        }
      })

      // --- reactions: like ---
      .addCase(likePostThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(state, 'like', postId, true);
        // Optimistic UI update: bump counts and flip likedByMe so the
        // button feels immediate. Server-confirmed update overwrites
        // these values below.
        const cur = getInteraction(state, postId);
        state.interactions.byPostId[postId] = {
          likeCount: cur.likedByMe ? cur.likeCount : cur.likeCount + 1,
          likedByMe: true,
          commentCount: cur.commentCount,
        };
      })
      .addCase(likePostThunk.fulfilled, (state, action) => {
        const { postId, payload } = action.payload;
        setMutationFlag(state, 'like', postId, false);
        const summary = payload?.data?.summary;
        if (summary) mergeSingleInteraction(state, postId, summary);
      })
      .addCase(likePostThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(
          state,
          'like',
          postId,
          false,
          action.payload || 'Unable to like the post.'
        );
        // Roll back the optimistic update — refetch the authoritative
        // summary so the UI returns to the correct state.
        // (A network error here doesn't always mean the backend
        // rejected the like; the refetch handles both cases.)
      })

      // --- reactions: unlike ---
      .addCase(unlikePostThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(state, 'like', postId, true);
        // Optimistic UI update.
        const cur = getInteraction(state, postId);
        state.interactions.byPostId[postId] = {
          likeCount: cur.likedByMe
            ? Math.max(0, cur.likeCount - 1)
            : cur.likeCount,
          likedByMe: false,
          commentCount: cur.commentCount,
        };
      })
      .addCase(unlikePostThunk.fulfilled, (state, action) => {
        const { postId, payload } = action.payload;
        setMutationFlag(state, 'like', postId, false);
        const summary = payload?.data?.summary;
        if (summary) mergeSingleInteraction(state, postId, summary);
      })
      .addCase(unlikePostThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(
          state,
          'like',
          postId,
          false,
          action.payload || 'Unable to unlike the post.'
        );
      })

      // --- reaction summary (single post) ---
      .addCase(fetchReactionSummary.fulfilled, (state, action) => {
        const { postId, payload } = action.payload;
        const summary = payload?.data;
        if (summary) mergeSingleInteraction(state, postId, summary);
      })

      // --- comments: list ---
      .addCase(fetchComments.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        const slot = setCommentState(state, postId);
        slot.loading = true;
        slot.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        const { postId, append, payload } = action.payload;
        const comments = payload?.data?.comments ?? [];
        const pagination = payload?.data?.pagination ?? null;
        const slot = setCommentState(state, postId);
        slot.comments = append ? [...slot.comments, ...comments] : comments;
        slot.pagination = pagination;
        slot.loading = false;
        slot.error = null;
        slot.expanded = true;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        const slot = setCommentState(state, postId);
        slot.loading = false;
        slot.error = action.payload || 'Unable to load comments.';
      })

      // --- comments: create ---
      .addCase(createCommentThunk.pending, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(state, 'createComment', postId, true);
      })
      .addCase(createCommentThunk.fulfilled, (state, action) => {
        const { postId, payload } = action.payload;
        setMutationFlag(state, 'createComment', postId, false);
        const newComment = payload?.data?.comment;
        if (newComment) {
          const slot = setCommentState(state, postId);
          slot.comments = [
            newComment,
            ...slot.comments.filter((c) => c && c.id !== newComment.id),
          ];
          // Bump cached commentCount optimistically.
          const cur = getInteraction(state, postId);
          state.interactions.byPostId[postId] = {
            ...cur,
            commentCount: cur.commentCount + 1,
          };
        }
      })
      .addCase(createCommentThunk.rejected, (state, action) => {
        const { postId } = action.meta.arg || {};
        if (!postId) return;
        setMutationFlag(
          state,
          'createComment',
          postId,
          false,
          action.payload || 'Unable to create the comment.'
        );
      })

      // --- comments: update ---
      .addCase(updateCommentThunk.pending, (state, action) => {
        const { commentId } = action.meta.arg || {};
        if (!commentId) return;
        setMutationFlag(state, 'updateComment', commentId, true);
      })
      .addCase(updateCommentThunk.fulfilled, (state, action) => {
        const { commentId, payload } = action.payload;
        setMutationFlag(state, 'updateComment', commentId, false);
        const updated = payload?.data?.comment;
        if (updated) {
          for (const postId of Object.keys(state.comments.byPostId)) {
            const slot = state.comments.byPostId[postId];
            slot.comments = slot.comments.map((c) =>
              c && c.id === commentId ? updated : c
            );
          }
        }
      })
      .addCase(updateCommentThunk.rejected, (state, action) => {
        const { commentId } = action.meta.arg || {};
        if (!commentId) return;
        setMutationFlag(
          state,
          'updateComment',
          commentId,
          false,
          action.payload || 'Unable to update the comment.'
        );
      })

      // --- comments: delete ---
      .addCase(deleteCommentThunk.pending, (state, action) => {
        const { commentId } = action.meta.arg || {};
        if (!commentId) return;
        setMutationFlag(state, 'deleteComment', commentId, true);
      })
      .addCase(deleteCommentThunk.fulfilled, (state, action) => {
        const { postId, commentId, payload } = action.payload;
        setMutationFlag(state, 'deleteComment', commentId, false);
        if (!payload) return;
        const removed = payload?.data?.removed === true;
        if (removed) {
          for (const pid of Object.keys(state.comments.byPostId)) {
            const slot = state.comments.byPostId[pid];
            slot.comments = slot.comments.filter(
              (c) => c && c.id !== commentId
            );
          }
          // Decrement cached commentCount.
          if (postId) {
            const cur = getInteraction(state, postId);
            state.interactions.byPostId[postId] = {
              ...cur,
              commentCount: Math.max(0, cur.commentCount - 1),
            };
          }
        }
      })
      .addCase(deleteCommentThunk.rejected, (state, action) => {
        const { commentId } = action.meta.arg || {};
        if (!commentId) return;
        setMutationFlag(
          state,
          'deleteComment',
          commentId,
          false,
          action.payload || 'Unable to delete the comment.'
        );
      });
  },
});

export const { resetPostState, clearMutationError, toggleCommentsExpanded } =
  slice.actions;
export default slice.reducer;

// Helpers (interactionSummary merging) live above.

function mergeInteractions(state, summaries) {
  // summaries may be either a plain object or a Map depending on the
  // backend. Both shapes are supported.
  if (!summaries) return;
  if (summaries instanceof Map) {
    for (const [postId, summary] of summaries) {
      mergeSingleInteraction(state, postId, summary);
    }
    return;
  }
  for (const [postId, summary] of Object.entries(summaries)) {
    mergeSingleInteraction(state, postId, summary);
  }
}

function mergeSingleInteraction(state, postId, summary) {
  state.interactions.byPostId[postId] = normalizeInteraction(summary);
}

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

export const selectInteraction = (postId) =>
  createSelector(
    [selectPostState, () => postId],
    (p, id) => p.interactions.byPostId[id] ?? { ...DEFAULT_INTERACTION }
  );

export const selectComments = (postId) =>
  createSelector(
    [selectPostState, () => postId],
    (p, id) =>
      p.comments.byPostId[id] ?? {
        comments: [],
        pagination: null,
        loading: false,
        error: null,
        expanded: false,
      }
  );

export const selectCreatePostState = createSelector([selectPostState], (p) => ({
  loading: p.mutations.create.loading,
  error: p.mutations.create.error,
}));

export const selectCreateMutationState = createSelector(
  [selectPostState],
  (p) => ({
    loading: p.mutations.create.loading,
    error: p.mutations.create.error,
  })
);

export const selectUpdatePostState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.update.loadingById[id]),
    error: p.mutations.update.errorById[id] ?? null,
  }));

export const selectDeletePostState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.delete.loadingById[id]),
    error: p.mutations.delete.errorById[id] ?? null,
  }));

export const selectDeleteMutationState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.delete.loadingById[id]),
    error: p.mutations.delete.errorById[id] ?? null,
  }));

export const selectUpdateMutationState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.update.loadingById[id]),
    error: p.mutations.update.errorById[id] ?? null,
  }));

export const selectLikeState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.like.loadingById[id]),
    error: p.mutations.like.errorById[id] ?? null,
  }));

export const selectCreateCommentState = (postId) =>
  createSelector([selectPostState, () => postId], (p, id) => ({
    loading: Boolean(p.mutations.createComment.loadingById[id]),
    error: p.mutations.createComment.errorById[id] ?? null,
  }));

export const selectUpdateCommentState = (commentId) =>
  createSelector([selectPostState, () => commentId], (p, id) => ({
    loading: Boolean(p.mutations.updateComment.loadingById[id]),
    error: p.mutations.updateComment.errorById[id] ?? null,
  }));

export const selectDeleteCommentState = (commentId) =>
  createSelector([selectPostState, () => commentId], (p, id) => ({
    loading: Boolean(p.mutations.deleteComment.loadingById[id]),
    error: p.mutations.deleteComment.errorById[id] ?? null,
  }));

// fetchFeed, fetchMyPosts, fetchUserPosts, fetchPost are already
// re-exported by the const declarations above.
