import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useAuth } from '../../context/AuthContext.jsx';
import {
  createPostThunk,
  resetPostState,
  selectCreateMutationState,
} from '../../store/slices/postSlice.js';

const MAX_CONTENT_LENGTH = 3000;

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

/**
 * NEXORA — PostComposer.
 *
 * Text-post composer. The textarea content is **local** React state —
 * we never dispatch per-keystroke into Redux. Only the dispatch
 * happens when the user submits.
 *
 *   - Max length matches the backend (3000 chars).
 *   - Validation rejects empty / whitespace-only content.
 *   - Server-confirmed state: do NOT use optimistic updates. On
 *     success, the slice reducer prepends the new post to feed / myPosts.
 *   - On failure, the user's text is preserved so they can retry.
 */
function PostComposer({ autoFocus = false }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const { loading, error } = useSelector(selectCreateMutationState);

  const [content, setContent] = useState('');
  const textareaRef = useRef(null);
  const composerId = useId();

  // Auto-grow the textarea up to a reasonable max-height.
  useEffect(() => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    const max = 240; // px
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [content]);

  // Clear composer error when the user starts editing again.
  useEffect(() => {
    if (content && error) {
      dispatch(resetPostState());
    }
  }, [content, error, dispatch]);

  const trimmed = content.trim();
  const remaining = MAX_CONTENT_LENGTH - content.length;
  const tooLong = content.length > MAX_CONTENT_LENGTH;
  const canSubmit = trimmed.length > 0 && !tooLong && !loading;

  function handleChange(event) {
    setContent(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      await dispatch(createPostThunk(trimmed)).unwrap();
      setContent('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (_err) {
      // The slice records the error message. Composer text is preserved
      // so the user can retry without re-typing.
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby={`${composerId}-label`}
    >
      <h2 id={`${composerId}-label`} className="sr-only">
        Create a post
      </h2>
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-nexora-accent text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {initialsFrom(authUser)}
        </div>

        <div className="min-w-0 flex-1">
          <label htmlFor={composerId} className="sr-only">
            Post content
          </label>
          <textarea
            ref={textareaRef}
            id={composerId}
            name="content"
            value={content}
            onChange={handleChange}
            placeholder="Share an update with your network…"
            rows={3}
            disabled={loading}
            autoFocus={autoFocus}
            aria-invalid={tooLong || Boolean(error) || undefined}
            aria-describedby={`${composerId}-counter ${composerId}-error`}
            className="block w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-nexora-accent focus:outline-none focus:ring-2 focus:ring-nexora-accent/30 disabled:opacity-60"
          />

          {error ? (
            <p
              id={`${composerId}-error`}
              role="alert"
              className="mt-2 text-xs text-rose-700"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span
              id={`${composerId}-counter`}
              aria-live="polite"
              className={`text-xs ${
                tooLong
                  ? 'text-rose-600'
                  : remaining < 100
                    ? 'text-amber-700'
                    : 'text-slate-500'
              }`}
            >
              {remaining} characters left
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-md bg-nexora-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-nexora-accent-hover disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default PostComposer;
