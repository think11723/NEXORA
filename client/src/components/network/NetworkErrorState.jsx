/**
 * NEXORA — NetworkErrorState.
 *
 * User-facing error UI for Network section failures with a retry action.
 */
function NetworkErrorState({ message, onRetry, isRetrying = false }) {
  return (
    <div
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-6 text-center"
      role="alert"
    >
      <h3 className="text-base font-semibold text-rose-900">
        Unable to load this section
      </h3>
      {message ? (
        <p className="mt-1 text-sm text-rose-800">{message}</p>
      ) : (
        <p className="mt-1 text-sm text-rose-800">
          Something went wrong on our side. Please try again.
        </p>
      )}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 inline-flex items-center justify-center rounded-md border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
        >
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      ) : null}
    </div>
  );
}

export default NetworkErrorState;
