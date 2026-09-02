import { Route, Routes } from 'react-router-dom';

import FoundationLayout from '../layouts/FoundationLayout.jsx';
import FeedPage from '../pages/FeedPage.jsx';
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
 * The authenticated home `/` renders the Feed. `/feed` is also exposed
 * explicitly as an alias — same component, same protection — so deep
 * links and the navigation can use either.
 *
 * `/login` and `/register` are public-only. The health-test page and
 * a 404 fallback live inside the foundation shell.
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
        path="/feed"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FeedPage />
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
