/**
 * NEXORA — ProfileCover.
 *
 * Renders the cover photo when a valid URL is provided, otherwise a
 * polished gradient placeholder. No upload pipeline — the URL is
 * treated as an opaque remote reference.
 */
function ProfileCover({ photoUrl, alt }) {
  if (photoUrl) {
    return (
      <div className="profile-cover">
        <img
          className="profile-cover__image"
          src={photoUrl}
          alt={alt || 'Profile cover photo'}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className="profile-cover profile-cover--fallback"
      role="img"
      aria-label={alt || 'Profile cover placeholder'}
    >
      <span className="profile-cover__placeholder-text" aria-hidden="true">
        NEXORA
      </span>
    </div>
  );
}

export default ProfileCover;
