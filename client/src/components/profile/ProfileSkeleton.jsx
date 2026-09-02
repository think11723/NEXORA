/**
 * NEXORA — ProfileSkeleton.
 *
 * Polished loading state for the profile page. Renders placeholder
 * shapes that match the eventual layout so the page does not "jump"
 * when real data arrives.
 */
function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" aria-busy="true" aria-live="polite">
      <div className="profile-skeleton__cover skeleton skeleton--cover" />
      <div className="profile-skeleton__identity">
        <div className="profile-skeleton__avatar skeleton skeleton--avatar" />
        <div className="profile-skeleton__lines">
          <div className="skeleton skeleton--line skeleton--line-lg" />
          <div className="skeleton skeleton--line skeleton--line-md" />
          <div className="skeleton skeleton--line skeleton--line-sm" />
        </div>
      </div>
      <div className="profile-skeleton__card skeleton skeleton--card" />
      <div className="profile-skeleton__card skeleton skeleton--card" />
    </div>
  );
}

export default ProfileSkeleton;
