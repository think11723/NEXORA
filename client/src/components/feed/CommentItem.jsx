import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '../../context/AuthContext.jsx';
import PostTimestamp from './PostTimestamp.jsx';
import {
  deleteCommentThunk,
  selectDeleteCommentState,
  selectUpdateCommentState,
  updateCommentThunk,
} from '../../store/slices/postSlice.js';

const MAX_CONTENT_LENGTH = 1000;

function initialsFrom(user) {
  if (!user || typeof user !== 'object') return '?';
  const first = (user.firstName ?? '').trim();
  const last = (user.lastName ?? '').trim();
  const a = first.charAt(0).toUpperCase();
  const b = last.charAt(0).toUpperCase();
  if (a && b) return `${a}${b}`;
  if (a) return a;
  if (b) return b;
  if (first) return first.charAt(0).toUpperCase();
  if (last) return last.charAt(0).toUpperCase();
  return '?';
}

function CommentAvatar({ photoUrl, user }) {
  const fallbackName =
    user?.fullName?.trim() ||
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'NEXORA member';
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${fallbackName}'s profile photo`}
        loading="lazy"
        className="h-8 w-8 flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
      role="img"
      aria-label={`${fallbackName}'s avatar`}
    >
      <span aria-hidden="true">{initialsFrom(user)}</span>
    </div>
  );
}

function ConfirmDelete({ onConfirm, onCancel, busy }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="mt-2 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm"
    >
      <span className="text-rose-800">Delete this comment?</span>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="ml-auto rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  );
}

function EditCommentForm({ initial, onCancel, onSave }) {
  const taId = useId();
  const editorRef = useRef(null);
  const [content, setContent] = useState(initial);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
      const len = editorRef.current.value.length;
      editorRef.current.setSelectionRange(len, len);
    }
  }, []);

  function handleSave() {
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setLocalError('Comment cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      setLocalError(
        `Comment must be at most ${MAX_CONTENT_LENGTH} characters.`
      );
      return;
    }
    setLocalError(null);
    onSave(trimmed);
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <label htmlFor={taId} className="sr-only">
        Edit comment
      </label>
      <textarea
        id={taId}
        ref={editorRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="block w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 focus:border-nexora-accent focus:outline-none focus:ring-2 focus:ring-nexora-accent/30"
      />
      {localError ? (
        <p role="alert" className="mt-1 text-xs text-rose-700">
          {localError}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-nexora-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-nexora-accent-hover"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function CommentItem({ comment, postId }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const author = comment?.author;
  const user = author?.user;
  const profile = author?.profile;
  const isOwn =
    Boolean(authUser?.id) && user?.id === authUser.id && !author?.placeholder;

  const { loading: updating, error: updateError } = useSelector(
    selectUpdateCommentState(comment.id)
  );
  const { loading: deleting, error: deleteError } = useSelector(
    selectDeleteCommentState(comment.id)
  );

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setEditing(false);
    setConfirmingDelete(false);
  }, [comment.id, comment.content]);

  function handleSave(newContent) {
    dispatch(
      updateCommentThunk({ commentId: comment.id, content: newContent })
    ).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') setEditing(false);
    });
  }

  function handleDelete() {
    dispatch(deleteCommentThunk({ postId, commentId: comment.id })).then(
      (action) => {
        if (action.meta.requestStatus === 'fulfilled')
          setConfirmingDelete(false);
      }
    );
  }

  if (!comment || !author) return null;

  return (
    <article
      id={`comment-${comment.id}`}
      className="rounded-md border border-slate-100 bg-white p-3"
    >
      <div className="flex items-start gap-3">
        <CommentAvatar photoUrl={profile?.profilePhoto} user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-semibold ${
                  author.placeholder
                    ? 'text-slate-500 italic'
                    : 'text-slate-900'
                }`}
              >
                {user?.fullName || 'NEXORA member'}
              </p>
              <PostTimestamp iso={comment.createdAt} />
            </div>

            {isOwn ? (
              <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                {!editing && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      disabled={deleting}
                      className="text-slate-600 hover:text-slate-900 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    {!confirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        disabled={updating}
                        className="text-rose-600 hover:text-rose-800 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>

          {editing ? (
            <EditCommentForm
              initial={comment.content || ''}
              onCancel={() => setEditing(false)}
              onSave={handleSave}
            />
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
              {comment.content}
            </p>
          )}

          {updateError ? (
            <p role="alert" className="mt-1 text-xs text-rose-700">
              {updateError}
            </p>
          ) : null}

          {confirmingDelete ? (
            <ConfirmDelete
              onConfirm={handleDelete}
              onCancel={() => setConfirmingDelete(false)}
              busy={deleting}
            />
          ) : null}
          {deleteError && !confirmingDelete ? (
            <p role="alert" className="mt-1 text-xs text-rose-700">
              {deleteError}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default CommentItem;
