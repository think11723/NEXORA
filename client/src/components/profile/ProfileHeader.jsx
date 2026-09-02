import ProfileAvatar from './ProfileAvatar.jsx';
import ProfileCover from './ProfileCover.jsx';

/**
 * NEXORA — ProfileHeader.
 *
 * Cover + avatar + identity block + (optional) owner edit action.
 * Owner detection is a UI concern; the backend enforces authorization
 * independently.
 */
function ProfileHeader({
  profile,
  user,
  isOwner = false,
  onEdit,
  connectionAction = null,
}) {
  const fullName =
    (user?.fullName && user.fullName.trim()) ||
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'NEXORA member';

  const headline = (profile?.headline ?? '').trim();
  const location = (profile?.location ?? '').trim();
  const currentPosition = (profile?.currentPosition ?? '').trim();
  const industry = (profile?.industry ?? '').trim();

  const subtitleParts = [];
  if (currentPosition) subtitleParts.push(currentPosition);
  if (industry) subtitleParts.push(industry);
  if (location) subtitleParts.push(location);
  const subtitle = subtitleParts.join(' · ');

  return (
    <header className="profile-header">
      <ProfileCover
        photoUrl={profile?.coverPhoto}
        alt={`${fullName}'s cover photo`}
      />

      <div className="profile-header__identity">
        <div className="profile-header__avatar-wrap">
          <ProfileAvatar
            photoUrl={profile?.profilePhoto}
            user={user}
            alt={`${fullName}'s profile photo`}
            size="xl"
          />
        </div>

        <div className="profile-header__text">
          <h1 className="profile-header__name">{fullName}</h1>

          {headline ? (
            <p className="profile-header__headline">{headline}</p>
          ) : (
            isOwner && (
              <button
                type="button"
                className="profile-header__prompt"
                onClick={onEdit}
              >
                Add a headline
              </button>
            )
          )}

          {subtitle ? (
            <p className="profile-header__subtitle">{subtitle}</p>
          ) : (
            isOwner && (
              <button
                type="button"
                className="profile-header__prompt profile-header__prompt--inline"
                onClick={onEdit}
              >
                Add location, current position, or industry
              </button>
            )
          )}
        </div>

        {isOwner ? (
          <div className="profile-header__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onEdit}
            >
              Edit profile
            </button>
          </div>
        ) : connectionAction ? (
          <div className="profile-header__actions">{connectionAction}</div>
        ) : (
          <div className="profile-header__actions">
            <span
              className="profile-header__future-hint"
              title="Connecting, following and messaging arrive in a later phase"
            >
              Connect, follow, and message are coming soon.
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default ProfileHeader;
