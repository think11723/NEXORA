import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '../../context/AuthContext.jsx';
import {
  likePostThunk,
  selectLikeState,
  selectInteraction,
  unlikePostThunk,
} from '../../store/slices/postSlice.js';

/**
 * NEXORA — PostInteractionBar.
 *
 * The Like button + comment count + Comments toggle. Reads the
 * interaction block from Redux (per-post cache) so the Feed doesn't
 * have to fetch per-post summaries. Dispatches the like / unlike
 * thunks; the slice handles the optimistic bump + server-confirmed
 * merge.
 */
function PostInteractionBar({ postId, onToggleComments, commentsExpanded }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const interaction = useSelector(selectInteraction(postId));
  const { loading, error } = useSelector(selectLikeState(postId));

  const disabled = !authUser?.id || loading;
  const isLiked = Boolean(interaction.likedByMe);
  const likeCount = interaction.likeCount;
  const commentCount = interaction.commentCount;

  function handleLikeClick() {
    if (disabled) return;
    if (isLiked) {
      dispatch(unlikePostThunk(postId));
    } else {
      dispatch(likePostThunk(postId));
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm">
      <button
        type="button"
        onClick={handleLikeClick}
        disabled={disabled}
        aria-pressed={isLiked}
        aria-label={isLiked ? 'Unlike post' : 'Like post'}
        className={
          isLiked
            ? 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-nexora-accent transition hover:bg-nexora-accent/10 disabled:cursor-not-allowed disabled:opacity-60'
            : 'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60'
        }
      >
        <span aria-hidden="true" className="text-base leading-none">
          {isLiked ? '♥' : '♡'}
        </span>
        <span className="font-medium">
          {loading
            ? isLiked
              ? 'Liked'
              : 'Liking…'
            : isLiked
              ? 'Liked'
              : 'Like'}
        </span>
        <span className="text-xs text-slate-500">({likeCount})</span>
      </button>

      <button
        type="button"
        onClick={onToggleComments}
        aria-expanded={Boolean(commentsExpanded)}
        aria-controls={`comments-${postId}`}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-slate-600 transition hover:bg-slate-100"
      >
        <span aria-hidden="true">💬</span>
        <span className="font-medium">Comments</span>
        <span className="text-xs text-slate-500">({commentCount})</span>
      </button>

      {error ? (
        <p role="alert" className="ml-auto text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default PostInteractionBar;
