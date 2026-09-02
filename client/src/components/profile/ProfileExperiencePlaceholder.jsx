/**
 * NEXORA — ProfileExperiencePlaceholder.
 *
 * Honest placeholder for Experience / Education / Skills sections that
 * arrive in later phases. Renders no fake data — just a clear signal
 * that these areas exist and will be implemented.
 */
function ProfileExperiencePlaceholder() {
  return (
    <section className="profile-section" aria-labelledby="profile-future-title">
      <h2 id="profile-future-title" className="profile-section__title">
        Experience, education, and skills
      </h2>
      <p className="profile-section__body profile-section__body--muted">
        These sections arrive in a later NEXORA phase. When they ship, they will
        appear here and be editable through the same profile experience.
      </p>
    </section>
  );
}

export default ProfileExperiencePlaceholder;
