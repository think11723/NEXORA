/**
 * NEXORA — NetworkEmptyState.
 *
 * Intentional empty states for each Network section. No fake people, no
 * fake counts — just a clear message and a single primary action.
 */
function NetworkEmptyState({ title, body, actionLabel, onAction, testId }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"
      data-testid={testId}
    >
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {body ? (
        <p className="mt-1 max-w-sm text-sm text-slate-600">{body}</p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-nexora-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-nexora-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-nexora-accent focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default NetworkEmptyState;
