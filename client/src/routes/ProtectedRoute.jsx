import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

/**
 * Route guard for authenticated-only views.
 *
 * While the AuthContext is bootstrapping, shows a lightweight loading
 * state so the protected page never flashes through the gate.
 *
 * Unauthenticated visitors are redirected to /login. The intended
 * destination is preserved in `state.from` so future prompts can offer
 * post-login redirect-back.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="route-loading" role="status" aria-live="polite">
        <span className="route-loading__spinner" aria-hidden="true" />
        <span>Restoring your session…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
