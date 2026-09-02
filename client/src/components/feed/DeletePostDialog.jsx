import { useEffect, useId, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  deletePostThunk,
  selectDeleteMutationState,
} from '../../store/slices/postSlice.js';

/**
 * NEXORA — DeletePostDialog.
 *
 * Confirmation dialog for deleting a post. The actual deletion is
 * server-confirmed; the slice's deletePostThunk.fulfilled reducer
 * removes the matching post from every list it appears in.
 *
 * Closes on Escape / backdrop click / Cancel button. Confirming
 * dispatches the thunk; the button is disabled while in-flight.
 */
function DeletePostDialog({ postId, open, onClose }) {
  const dispatch = useDispatch();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  const { loading, error } = useSelector(selectDeleteMutationState(postId));

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
    previousFocus.current = document.activeElement;
    const id = window.setTimeout(() => {
      dialogRef.current?.querySelector('button[data-confirm]')?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
      window.clearTimeout(id);
      if (
        previousFocus.current &&
        typeof previousFocus.current.focus === 'function'
      ) {
        previousFocus.current.focus();
      }
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    try {
      await dispatch(deletePostThunk(postId)).unwrap();
      onClose?.();
    } catch (_err) {
      // Error recorded in slice; dialog stays open.
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-base font-semibold text-slate-900">
          Delete this post?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This action cannot be undone. The post will be permanently removed
          from your feed and your profile.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            data-confirm
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeletePostDialog;
