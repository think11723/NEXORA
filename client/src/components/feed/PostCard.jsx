import { useAuth } from '../../context/AuthContext.jsx';
import { useDispatch, useSelector } from 'react-redux';

import PostActionsMenu from './PostActionsMenu.jsx';
import PostAuthor from './PostAuthor.jsx';
import PostContent from './PostContent.jsx';
import PostInteractionBar from './PostInteractionBar.jsx';
import PostTimestamp from './PostTimestamp.jsx';
import CommentsSection from './CommentsSection.jsx';
import {
  selectComments,
  toggleCommentsExpanded,
} from '../../store/slices/postSlice.js';

/**
 * NEXORA — PostCard.
 *
 * Renders one post from the backend safe-projection shape.
 *
 *   {
 *     id, content, visibility, createdAt, updatedAt,
 *     author: { user, profile, placeholder },
 *     interaction: { likeCount, likedByMe, commentCount }
 *   }
 *
 * Edit / Delete actions are wired only when the authenticated user
 * matches `author.user.id`. Ownership is the caller's, but the
 * backend re-enforces on every mutation.
 *
 * Phase 5 Prompt 3 added: an interaction bar (Like + comments count +
 * Comments toggle) and a lazy-loaded comments section. The comments
 * section is rendered only when expanded; the slice fetches on the
 * first expand.
 */
function PostCard({ post, onEdit, onDelete, children }) {
  const { user: authUser } = useAuth();
  const dispatch = useDispatch();
  const isOwn = Boolean(authUser?.id && post?.author?.user?.id === authUser.id);
  const commentsState = useSelector(selectComments(post.id));
  const commentsExpanded = Boolean(commentsState?.expanded);

  // Only the "edited" indicator fires when updatedAt is strictly later
  // than createdAt — the backend stores both timestamps.
  const edited =
    post?.updatedAt &&
    post?.createdAt &&
    new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <PostAuthor authorBlock={post.author} />
        {isOwn && onEdit && onDelete ? (
          <PostActionsMenu onEdit={onEdit} onDelete={onDelete} />
        ) : null}
      </header>

      <div className="mt-3">
        <PostContent content={post.content} />
      </div>

      <PostInteractionBar
        postId={post.id}
        commentsExpanded={commentsExpanded}
        onToggleComments={() => dispatch(toggleCommentsExpanded(post.id))}
      />

      <CommentsSection postId={post.id} expanded={commentsExpanded} />

      <footer className="mt-3 flex items-center justify-between text-xs">
        <PostTimestamp iso={post.createdAt} edited={edited} />
        {children}
      </footer>
    </article>
  );
}

export default PostCard;
