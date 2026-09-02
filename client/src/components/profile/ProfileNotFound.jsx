import { Link } from 'react-router-dom';

function ProfileNotFound() {
  return (
    <section className="profile-state profile-state--not-found">
      <h1 className="profile-state__title">Profile not found</h1>
      <p className="profile-state__body">
        We could not find a NEXORA profile for this user. They may have
        deactivated their account or the link may be incorrect.
      </p>
      <Link to="/" className="btn btn--secondary">
        Back to home
      </Link>
    </section>
  );
}

export default ProfileNotFound;
