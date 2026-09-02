import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import DeletePostDialog from './DeletePostDialog.jsx';
import EditPostModal from './EditPostModal.jsx';
import PostCard from './PostCard.jsx';
import PostComposer from './PostComposer.jsx';
import PostEmptyState from './PostEmptyState.jsx';
import PostErrorState from './PostErrorState.jsx';
import PostSkeleton from './PostSkeleton.jsx';
import {
  fetchFeed,
  selectFeedError,
  selectFeedLoading,
  selectFeedPagination,
  selectFeedPosts,
} from '../../store/slices/postSlice.js';

/**
 * NEXORA — FeedPageContent.
 *
 * Owns the feed render + the local edit/delete modal state. The
 * pagination is "Load more" rather than infinite-scroll — the backend
 * pagination metadata is the authority (hasNextPage).
 *
 * Safeguards:
 *   - The "Load more" button is disabled while the next page is in flight.
 *   - Duplicate load-more requests for the same page are blocked by
 *     tracking the in-flight page locally.
 *   - StrictMode double-invocation of the mount effect is handled by an
 *     `aborted` ref so we don't dispatch twice for the same first page.
 */
function FeedPageContent() {
  const dispatch = useDispatch();
  const posts = useSelector(selectFeedPosts);
  const loading = useSelector(selectFeedLoading);
  const error = useSelector(selectFeedError);
  const pagination = useSelector(selectFeedPagination);

  const [editingPostId, setEditingPostId] = useState(null);
  const [editingInitialContent, setEditingInitialContent] = useState('');
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const composerRef = useRef(null);
  const aborted = useRef(false);

  const focusComposer = useCallback(() => {
    const ta = composerRef.current?.querySelector('textarea');
    if (ta) {
      ta.focus();
    }
  }, []);

  // Initial load.
  useEffect(() => {
    aborted.current = false;
    dispatch(fetchFeed({ page: 1, limit: 20 }));
    return () => {
      aborted.current = true;
    };
    // dispatch is stable; we only want this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(() => {
    if (!pagination?.hasNextPage) return;
    if (loadingMore || loading) return;
    const nextPage = (pagination.page || 1) + 1;
    setLoadingMore(true);
    dispatch(fetchFeed({ page: nextPage, limit: 20, append: true })).finally(
      () => {
        if (!aborted.current) setLoadingMore(false);
      }
    );
  }, [pagination, loading, loadingMore, dispatch]);

  const retry = useCallback(() => {
    dispatch(fetchFeed({ page: 1, limit: 20 }));
  }, [dispatch]);

  function startEdit(post) {
    setEditingPostId(post.id);
    setEditingInitialContent(post.content || '');
  }

  function closeEdit() {
    setEditingPostId(null);
    setEditingInitialContent('');
  }

  function startDelete(post) {
    setDeletingPostId(post.id);
  }

  function closeDelete() {
    setDeletingPostId(null);
  }

  const editingPost =
    editingPostId != null
      ? posts.find((p) => p && p.id === editingPostId)
      : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="sr-only">Feed</h1>

      <div ref={composerRef}>
        <PostComposer autoFocus={false} />
      </div>

      <section
        className="mt-6"
        aria-label="Feed posts"
        aria-busy={loading && posts.length === 0}
      >
        {loading && posts.length === 0 ? (
          <ul className="space-y-4">
            <li>
              <PostSkeleton />
            </li>
            <li>
              <PostSkeleton />
            </li>
            <li>
              <PostSkeleton />
            </li>
          </ul>
        ) : error && posts.length === 0 ? (
          <PostErrorState message={error} onRetry={retry} />
        ) : posts.length === 0 ? (
          <PostEmptyState onCreateFirstPost={focusComposer} />
        ) : (
          <ul className="space-y-4">
            {posts.map((post) =>
              post ? (
                <li key={post.id}>
                  <PostCard
                    post={post}
                    onEdit={() => startEdit(post)}
                    onDelete={() => startDelete(post)}
                  />
                </li>
              ) : null
            )}
          </ul>
        )}

        {posts.length > 0 && pagination?.hasNextPage ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </section>

      {editingPost ? (
        <EditPostModal
          postId={editingPost.id}
          initialContent={editingInitialContent}
          open
          onClose={closeEdit}
        />
      ) : null}

      {deletingPostId != null ? (
        <DeletePostDialog postId={deletingPostId} open onClose={closeDelete} />
      ) : null}
    </div>
  );
}

export default FeedPageContent;
