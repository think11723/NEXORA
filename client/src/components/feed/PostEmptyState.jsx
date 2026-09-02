/**
 * NEXORA — PostEmptyState.
 *
 * Polished empty state for the feed. No fake posts. Provides a call-to-
 * action that focuses the composer when available.
 */
function PostEmptyState({ onCreateFirstPost }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <h2 className="text-base font-semibold text-slate-900">
        Your feed is empty
      </h2>
      <p className="mt-2 max-w-md mx-auto text-sm text-slate-600">
        Posts you create and posts from your accepted connections will appear
        here. Start by sharing an update.
      </p>
      {onCreateFirstPost ? (
        <button
          type="button"
          onClick={onCreateFirstPost}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-nexora-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-nexora-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-nexora-accent focus-visible:ring-offset-2"
        >
          Create your first post
        </button>
      ) : null}
    </div>
  );
}

export default PostEmptyState;
