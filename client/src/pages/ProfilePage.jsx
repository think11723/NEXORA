import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ProfileAbout from '../components/profile/ProfileAbout.jsx';
import ProfileConnectionAction from '../components/profile/ProfileConnectionAction.jsx';
import ProfileEditModal from '../components/profile/ProfileEditModal.jsx';
import ProfileErrorState from '../components/profile/ProfileErrorState.jsx';
import ProfileExperiencePlaceholder from '../components/profile/ProfileExperiencePlaceholder.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import ProfileNotFound from '../components/profile/ProfileNotFound.jsx';
import ProfileSkeleton from '../components/profile/ProfileSkeleton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as profileService from '../services/profileService.js';

/**
 * NEXORA — ProfilePage.
 *
 * Single orchestrator that handles both routes:
 *
 *   /profile/me         → owner's profile (protected by route guard)
 *   /profile/:userId    → public profile (no auth required)
 *
 * Owner detection is a UI concern only. The backend enforces ownership
 * independently. There is no AuthContext requirement on the public
 * route — the page works for unauthenticated visitors too.
 */

function interpretFetchError(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Unable to load this profile. Please try again.';
  }
  if (typeof payload.message === 'string' && payload.message.length > 0) {
    return payload.message;
  }
  return 'Unable to load this profile. Please try again.';
}

function ProfilePage() {
  const { userId: routeUserId } = useParams();
  const isOwnerRoute = !routeUserId; // /profile/me has no :userId param
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [loadStatus, setLoadStatus] = useState('idle'); // idle | loading | ok | error | not-found
  const [loadError, setLoadError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile whenever the route changes.
  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');
    setLoadError(null);
    setProfile(null);
    setProfileUser(null);

    async function run() {
      try {
        const envelope = isOwnerRoute
          ? await profileService.getMyProfile()
          : await profileService.getProfileByUserId(routeUserId);

        if (cancelled) return;
        setProfile(envelope?.data?.profile ?? null);
        setProfileUser(envelope?.data?.user ?? null);
        setLoadStatus('ok');
      } catch (err) {
        if (cancelled) return;
        const message = interpretFetchError(err);
        // Backend returns 404 when the user truly does not exist.
        // We can't see the HTTP status directly because the Axios
        // interceptor normalizes errors to the envelope, so we
        // pattern-match on the message.
        if (
          typeof message === 'string' &&
          /not\s*found/i.test(message) &&
          !isOwnerRoute
        ) {
          setLoadStatus('not-found');
        } else {
          setLoadError(message);
          setLoadStatus('error');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isOwnerRoute, routeUserId]);

  const isOwner =
    isOwnerRoute ||
    (Boolean(authUser?.id) &&
      Boolean(routeUserId) &&
      String(authUser.id) === String(routeUserId));

  const handleOpenEditor = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(async (patch) => {
    const envelope = await profileService.updateMyProfile(patch);
    const updated = envelope?.data?.profile ?? null;
    setProfile(updated);
    setIsEditing(false);
    return updated;
  }, []);

  if (loadStatus === 'loading' || loadStatus === 'idle') {
    return (
      <main className="profile-page">
        <ProfileSkeleton />
      </main>
    );
  }

  if (loadStatus === 'not-found') {
    return (
      <main className="profile-page">
        <ProfileNotFound />
      </main>
    );
  }

  if (loadStatus === 'error') {
    return (
      <main className="profile-page">
        <ProfileErrorState
          message={loadError ?? 'Unable to load this profile.'}
          onRetry={() => navigate(0)}
        />
      </main>
    );
  }

  return (
    <main className="profile-page">
      <ProfileHeader
        profile={profile}
        user={profileUser}
        isOwner={isOwner}
        onEdit={handleOpenEditor}
        connectionAction={
          !isOwner && routeUserId ? (
            <ProfileConnectionAction targetUserId={routeUserId} />
          ) : null
        }
      />

      <ProfileAbout
        about={profile?.about}
        isOwner={isOwner}
        onEdit={handleOpenEditor}
      />

      <ProfileExperiencePlaceholder />

      {isOwner ? (
        <ProfileEditModal
          open={isEditing}
          profile={profile}
          onClose={handleCloseEditor}
          onSave={handleSave}
        />
      ) : null}
    </main>
  );
}

export default ProfilePage;
