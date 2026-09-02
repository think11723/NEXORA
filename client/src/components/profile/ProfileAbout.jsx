/**
 * NEXORA — ProfileAbout.
 *
 * Renders the About section. Empty state is intentional: the owner is
 * invited to add a summary; visitors see a polite "not yet" hint
 * (without an edit prompt).
 */
function ProfileAbout({ about, isOwner = false, onEdit }) {
  const text = (about ?? '').trim();

  if (text) {
    return (
      <section
        className="profile-section"
        aria-labelledby="profile-about-title"
      >
        <h2 id="profile-about-title" className="profile-section__title">
          About
        </h2>
        <p className="profile-section__body profile-section__body--prewrap">
          {text}
        </p>
      </section>
    );
  }

  return (
    <section className="profile-section" aria-labelledby="profile-about-title">
      <h2 id="profile-about-title" className="profile-section__title">
        About
      </h2>
      {isOwner ? (
        <>
          <p className="profile-section__body profile-section__body--muted">
            You haven&apos;t added an About summary yet.
          </p>
          <button
            type="button"
            className="profile-section__prompt"
            onClick={onEdit}
          >
            Add a short summary about your professional background, interests,
            and goals.
          </button>
        </>
      ) : (
        <p className="profile-section__body profile-section__body--muted">
          This user hasn&apos;t written an About summary yet.
        </p>
      )}
    </section>
  );
}

export default ProfileAbout;
