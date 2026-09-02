import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  createCommentThunk,
  selectCreateCommentState,
} from '../../store/slices/postSlice.js';

const MAX_CONTENT_LENGTH = 1000;

function CommentComposer({ postId, onPosted }) {
  const dispatch = useDispatch();
  const taId = useId();
  const taRef = useRef(null);
  const [content, setContent] = useState('');
  const [localError, setLocalError] = useState(null);
  const { loading, error } = useSelector(selectCreateCommentState(postId));

  // Focus the textarea when the comments section is mounted.
  useEffect(() => {
    if (taRef.current) taRef.current.focus();
  }, []);

  function handleChange(event) {
    setContent(event.target.value);
    if (localError) setLocalError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
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
    try {
      await dispatch(createCommentThunk({ postId, content: trimmed })).unwrap();
      setContent('');
      onPosted?.();
    } catch (_err) {
      // Server error recorded in slice; preserved in the textarea so
      // the user can retry without re-typing.
    }
  }

  const remaining = MAX_CONTENT_LENGTH - content.length;
  const overLimit = content.length > MAX_CONTENT_LENGTH;
  const canSubmit = content.trim().length > 0 && !overLimit && !loading;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-slate-200 bg-slate-50 p-3"
      aria-label="Write a comment"
    >
      <label htmlFor={taId} className="sr-only">
        Comment content
      </label>
      <textarea
        ref={taRef}
        id={taId}
        name="content"
        value={content}
        onChange={handleChange}
        rows={2}
        disabled={loading}
        placeholder="Write a comment…"
        aria-invalid={overLimit || undefined}
        aria-describedby={`${taId}-counter`}
        className="block w-full resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-nexora-accent focus:outline-none focus:ring-2 focus:ring-nexora-accent/30 disabled:opacity-60"
      />

      {localError || error ? (
        <p role="alert" className="mt-1 text-xs text-rose-700">
          {localError || error}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <span
          id={`${taId}-counter`}
          aria-live="polite"
          className={`text-xs ${
            overLimit
              ? 'text-rose-600'
              : remaining < 50
                ? 'text-amber-700'
                : 'text-slate-500'
          }`}
        >
          {remaining} characters left
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-md bg-nexora-accent px-3 py-1 text-xs font-medium text-white transition hover:bg-nexora-accent-hover disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? 'Posting…' : 'Comment'}
        </button>
      </div>
    </form>
  );
}

export default CommentComposer;
