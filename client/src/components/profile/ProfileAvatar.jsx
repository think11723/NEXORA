/**
 * NEXORA — ProfileAvatar.
 *
 * Renders the user's profile photo when a valid URL is provided,
 * otherwise renders an initials-based fallback. Deterministic
 * initials — safe when firstName/lastName are missing.
 */
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

function ProfileAvatar({ photoUrl, user, alt, size = 'lg' }) {
  const sizeClass = `profile-avatar profile-avatar--${size}`;
  const name =
    (user?.fullName && user.fullName.trim()) ||
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'NEXORA member';

  if (photoUrl) {
    return (
      <img
        className={sizeClass}
        src={photoUrl}
        alt={alt || `${name}'s profile photo`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`${sizeClass} profile-avatar--fallback`}
      role="img"
      aria-label={`${name}'s profile avatar`}
    >
      <span aria-hidden="true">{initialsFrom(user)}</span>
    </div>
  );
}

export default ProfileAvatar;
