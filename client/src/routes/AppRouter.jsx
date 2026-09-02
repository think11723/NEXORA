import { Route, Routes } from 'react-router-dom';

import FoundationLayout from '../layouts/FoundationLayout.jsx';
import AuthenticatedHomePage from '../pages/AuthenticatedHomePage.jsx';
import HealthTestPage from '../pages/HealthTestPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import NetworkPage from '../pages/NetworkPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';

/**
 * Top-level routing.
 *
 * `/` is the authenticated home — protected by `ProtectedRoute`.
 * `/login` and `/register` are public-only; signed-in visitors are
 * redirected home. The health-test page and a 404 fallback sit inside
 * the foundation shell so they always have a consistent chrome.
 *
 * Profile routes:
 *   /profile/me        — protected (owner only). Declared BEFORE the
 *                        catch-all :userId route so React Router matches
 *                        the literal path first.
 *   /profile/:userId   — public. Anyone (authenticated or not) can view.
 */
function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AuthenticatedHomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile/me"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route path="/profile/:userId" element={<ProfilePage />} />

      <Route
        path="/network"
        element={
          <ProtectedRoute>
            <NetworkPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<FoundationLayout />}>
        <Route path="health-test" element={<HealthTestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
