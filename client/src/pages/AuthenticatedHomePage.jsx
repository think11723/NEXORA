import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { APP_NAME, APP_TAGLINE } from '../constants';

/**
 * Temporary authenticated home — proves the auth loop works.
 *
 * The full NEXORA home/feed is intentionally out of scope for Phase 2 —
 * this page exists so users see a meaningful destination after login.
 */
function AuthenticatedHomePage() {
  const navigate = useNavigate();
  const { user, logout, refreshCurrentUser } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  async function handleRefresh() {
    await refreshCurrentUser();
  }

  const fullName =
    user && (user.firstName || user.lastName)
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : 'NEXORA member';

  return (
    <section className="page page--home-authed">
      <header className="home-authed__header">
        <div>
          <h1 className="home-authed__brand">{APP_NAME}</h1>
          <p className="home-authed__tagline">{APP_TAGLINE}</p>
        </div>
        <div className="home-authed__actions">
          <Link to="/network" className="btn btn--primary">
            My Network
          </Link>
          <Link to="/profile/me" className="btn btn--secondary">
            View my profile
          </Link>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleRefresh}
          >
            Refresh account
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="card home-authed__welcome">
        <h2 className="card__title">Welcome, {fullName}</h2>
        <p className="card__body">
          You are signed in. This is a temporary success view — the real NEXORA
          feed and profile surfaces arrive in later phases.
        </p>
      </div>

      <div className="card home-authed__profile">
        <h2 className="card__title">Account</h2>
        <dl className="home-authed__details">
          <div>
            <dt>Email</dt>
            <dd>{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user?.role ?? 'user'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{user?.isActive === false ? 'Disabled' : 'Active'}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleString()
                : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card home-authed__next">
        <h2 className="card__title">What comes next</h2>
        <ul className="card__list">
          <li>
            Your profile is editable — visit &ldquo;View my profile&rdquo;
            above.
          </li>
          <li>
            Visit &ldquo;My Network&rdquo; to manage connections and respond to
            incoming requests.
          </li>
          <li>
            The health-test endpoint still works —{' '}
            <Link to="/health-test" className="auth-card__link">
              check it
            </Link>
            .
          </li>
          <li>
            Sessions persist in <code>localStorage</code> and are validated via{' '}
            <code>GET /api/v1/auth/me</code> on reload.
          </li>
        </ul>
      </div>
    </section>
  );
}

export default AuthenticatedHomePage;
