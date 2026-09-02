/**
 * NEXORA — ConnectionCard.
 *
 * Pure presentational card that renders a connection (accepted) or
 * pending request. It receives the full safe-projection shape from the
 * backend, including the small profile preview.
 *
 * Action buttons are passed in as children render-prop OR as an `actions`
 * prop. Default action semantics (View Profile, Remove / Accept / Reject /
 * Withdraw) are wired by the parent (NetworkPage or ProfilePage).
 */
import { Link } from 'react-router-dom';

function initialsFrom(user) {
  if (!user || typeof user !== 'object') return '?';
  const first = (user.firstName ?? '').trim();
  const last = (user.lastName ?? '').trim();
  const a = first.charAt(0).toUpperCase();
  const b = last.charAt(0).toUpperCase();
  if (a && b) return `${a}${b}`;
  if (a) return a;
  if (b) return b;
  return '?';
}

function displayName(item) {
  const u = item?.user;
  if (!u) return 'NEXORA member';
  if (u.fullName && u.fullName.trim()) return u.fullName;
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'NEXORA member';
}

function ConnectionAvatar({ photoUrl, user }) {
  const name = displayName({ user });
  if (photoUrl) {
    return (
      <img
        className="h-12 w-12 flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200"
        src={photoUrl}
        alt={`${name}'s profile photo`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-nexora-accent text-sm font-semibold text-white ring-1 ring-slate-200"
      role="img"
      aria-label={`${name}'s avatar`}
    >
      <span aria-hidden="true">{initialsFrom(user)}</span>
    </div>
  );
}

function ConnectionCard({ item, children }) {
  if (!item) return null;
  const name = displayName(item);
  const profile = item.profile ?? {};
  const headline = (profile.headline ?? '').trim();
  const userId = item.user?.id;

  return (
    <article className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <ConnectionAvatar photoUrl={profile.profilePhoto} user={item.user} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {name}
            </h3>
            {headline ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">
                {headline}
              </p>
            ) : (
              <p className="mt-0.5 text-sm italic text-slate-400">
                No headline yet.
              </p>
            )}
          </div>

          {children ? (
            <div className="flex flex-shrink-0 items-center gap-2">
              {children}
            </div>
          ) : null}
        </div>

        {userId ? (
          <Link
            to={`/profile/${userId}`}
            className="mt-2 inline-block text-xs font-medium text-nexora-accent hover:underline"
          >
            View profile →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default ConnectionCard;
