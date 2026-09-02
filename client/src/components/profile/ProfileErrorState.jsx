/**
 * NEXORA — ProfileErrorState.
 *
 * Generic failure UI for the profile page. Shows a user-facing message
 * (never the raw Axios object) and offers a retry action.
 */
function ProfileErrorState({ message, onRetry, isRetrying = false }) {
  return (
    <section className="profile-state profile-state--error" role="alert">
      <h1 className="profile-state__title">Unable to load profile</h1>
      <p className="profile-state__body">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      ) : null}
    </section>
  );
}

export default ProfileErrorState;
