import { Link } from 'react-router-dom';

/**
 * NEXORA — PostAuthor.
 *
 * Renders the author header for a post: avatar (or initials fallback),
 * display name, headline, and a link to the author's profile.
 *
 * Safely handles `placeholder: true` from the backend serializer —
 * shows a generic placeholder rather than fabricating a name.
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

function PostAvatar({ photoUrl, user }) {
  const fallbackName =
    user?.fullName?.trim() ||
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'NEXORA member';
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={`${fallbackName}'s profile photo`}
        loading="lazy"
        className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600 ring-1 ring-slate-200"
      role="img"
      aria-label={`${fallbackName}'s avatar`}
    >
      <span aria-hidden="true">{initialsFrom(user)}</span>
    </div>
  );
}

function PostAuthor({ authorBlock }) {
  const isPlaceholder = authorBlock?.placeholder;
  const user = authorBlock?.user;
  const profile = authorBlock?.profile;
  const fullName = user?.fullName || 'NEXORA member';
  const headline = profile?.headline ?? '';

  const avatarEl = <PostAvatar photoUrl={profile?.profilePhoto} user={user} />;

  const body = (
    <div className="min-w-0">
      <p
        className={`truncate text-sm font-semibold ${
          isPlaceholder ? 'text-slate-500 italic' : 'text-slate-900'
        }`}
      >
        {fullName}
      </p>
      {headline ? (
        <p className="truncate text-xs text-slate-600">{headline}</p>
      ) : null}
    </div>
  );

  // Don't link to a missing user's profile.
  if (!user?.id || isPlaceholder) {
    return (
      <div className="flex items-center gap-3">
        {avatarEl}
        {body}
      </div>
    );
  }

  return (
    <Link
      to={`/profile/${user.id}`}
      className="flex items-center gap-3 rounded hover:bg-slate-50"
    >
      {avatarEl}
      {body}
    </Link>
  );
}

export default PostAuthor;
