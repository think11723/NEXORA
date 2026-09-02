import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectUpdateMutationState,
  updatePostThunk,
} from '../../store/slices/postSlice.js';

const MAX_CONTENT_LENGTH = 3000;

/**
 * NEXORA — EditPostModal.
 *
 * Edit form for an existing post. Local React state for the draft text
 * (NOT in Redux). Server-confirmed update: we do not optimistically
 * patch Redux; the slice's updatePostThunk.fulfilled reducer replaces
 * the matching post in every list it appears in.
 *
 * Closing behavior:
 *   - Escape closes the modal
 *   - Click on the backdrop closes the modal
 *   - Cancel button closes the modal
 *
 * On success: close the modal and let the caller react to the slice
 * mutation flag (success / error).
 */
function EditPostModal({ postId, initialContent, open, onClose }) {
  const dispatch = useDispatch();
  const titleId = useId();
  const editorId = useId();
  const errorId = useId();
  const counterId = useId();
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  const [content, setContent] = useState(initialContent || '');
  const [touched, setTouched] = useState(false);

  const { loading, error } = useSelector(selectUpdateMutationState(postId));

  // Reset draft when the modal opens with a different post.
  useEffect(() => {
    if (open) {
      setContent(initialContent || '');
      setTouched(false);
      previousFocus.current = document.activeElement;
    }
  }, [open, initialContent]);

  // Escape + outside-click + restore focus.
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape' && !loading) {
        e.preventDefault();
        onClose?.();
      }
    }
    function handleClick(e) {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        if (!loading) onClose?.();
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    // Focus the textarea when the modal opens.
    const id = window.setTimeout(() => {
      const ta = dialogRef.current?.querySelector('textarea');
      ta?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
      window.clearTimeout(id);
      // Restore focus when closed
      if (
        previousFocus.current &&
        typeof previousFocus.current.focus === 'function'
      ) {
        previousFocus.current.focus();
      }
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  const trimmed = content.trim();
  const tooLong = content.length > MAX_CONTENT_LENGTH;
  const canSubmit = trimmed.length > 0 && !tooLong && !loading;

  function handleChange(event) {
    setContent(event.target.value);
    setTouched(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      await dispatch(updatePostThunk({ postId, content: trimmed })).unwrap();
      onClose?.();
    } catch (_err) {
      // Error recorded in slice; user can retry.
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          Edit post
        </h2>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor={editorId} className="sr-only">
            Post content
          </label>
          <textarea
            id={editorId}
            value={content}
            onChange={handleChange}
            rows={5}
            disabled={loading}
            aria-invalid={tooLong || undefined}
            aria-describedby={`${errorId} ${counterId}`}
            className="block w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-nexora-accent focus:outline-none focus:ring-2 focus:ring-nexora-accent/30 disabled:opacity-60"
          />

          {error && touched ? (
            <p id={errorId} role="alert" className="mt-2 text-xs text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span
              id={counterId}
              aria-live="polite"
              className={`text-xs ${
                tooLong
                  ? 'text-rose-600'
                  : MAX_CONTENT_LENGTH - content.length < 100
                    ? 'text-amber-700'
                    : 'text-slate-500'
              }`}
            >
              {MAX_CONTENT_LENGTH - content.length} characters left
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-md bg-nexora-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-nexora-accent-hover disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditPostModal;
