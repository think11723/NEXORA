import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchComments, selectComments } from '../../store/slices/postSlice.js';
import CommentComposer from './CommentComposer.jsx';
import CommentItem from './CommentItem.jsx';

/**
 * NEXORA — CommentsSection.
 *
 * Owns the comments-thread render for a single post. Lazy-loads on
 * first expand via the slice's `expanded` flag. Fetches the next page
 * only when the user clicks "Load more" and the backend reports
 * `hasNextPage`.
 */
function CommentsSection({ postId, expanded }) {
  const dispatch = useDispatch();
  const { comments, pagination, loading, error } = useSelector(
    selectComments(postId)
  );
  const lastExpanded = useRef(false);

  // Trigger the first fetch when the section becomes expanded.
  useEffect(() => {
    if (expanded && !lastExpanded.current) {
      lastExpanded.current = true;
      dispatch(fetchComments({ postId, page: 1, limit: 20 }));
    }
    if (!expanded) {
      lastExpanded.current = false;
    }
  }, [expanded, postId, dispatch]);

  function loadMore() {
    if (!pagination?.hasNextPage) return;
    if (loading) return;
    const nextPage = (pagination.page || 1) + 1;
    dispatch(
      fetchComments({ postId, page: nextPage, limit: 20, append: true })
    );
  }

  if (!expanded) return null;

  return (
    <section
      id={`comments-${postId}`}
      className="mt-3 space-y-3"
      aria-label="Comments"
    >
      <CommentComposer postId={postId} onPosted={() => {}} />

      {error && comments.length === 0 ? (
        <p
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {error}
        </p>
      ) : null}

      {comments.length === 0 && !loading ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-center text-xs text-slate-500">
          No comments yet. Be the first to reply.
        </p>
      ) : null}

      {loading && comments.length === 0 ? (
        <p
          role="status"
          aria-busy="true"
          className="text-center text-xs text-slate-500"
        >
          Loading comments…
        </p>
      ) : null}

      <ul className="space-y-2">
        {comments.map((c) =>
          c ? (
            <li key={c.id}>
              <CommentItem comment={c} postId={postId} />
            </li>
          ) : null
        )}
      </ul>

      {pagination?.hasNextPage ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more comments'}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default CommentsSection;
