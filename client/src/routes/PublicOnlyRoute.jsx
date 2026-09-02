import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

/**
 * Route guard for views that should only be reachable when unauthenticated
 * (e.g. /login and /register). Authenticated visitors are sent to the
 * authenticated home.
 *
 * While the AuthContext is bootstrapping, we render the children rather
 * than redirecting — preventing a flash from the public page to the home.
 */
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading__spinner" aria-hidden="true" />
        <span>Loading NEXORA…</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicOnlyRoute;
