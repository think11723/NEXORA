/**
 * NEXORA — PostErrorState.
 *
 * User-facing error UI with a retry action. Used for feed loading
 * failures. No raw stack traces, no internal server details.
 */
function PostErrorState({ message, onRetry, isRetrying = false }) {
  return (
    <div
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-center"
      role="alert"
    >
      <h2 className="text-sm font-semibold text-rose-900">
        Unable to load your feed
      </h2>
      <p className="mt-1 text-xs text-rose-800">
        {message || 'Something went wrong on our side. Please try again.'}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 inline-flex items-center justify-center rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      ) : null}
    </div>
  );
}

export default PostErrorState;
