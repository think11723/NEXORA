import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ConnectionActionButton from '../network/ConnectionActionButton.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  acceptRequest,
  fetchStatus,
  removeConnectionAction,
  sendRequest,
  withdrawRequest,
} from '../../store/slices/connectionSlice.js';
import {
  selectConnectionRelationship,
  selectIsStatusLoading,
  selectMutationError,
  selectMutationLoading,
} from '../../store/slices/connectionSlice.js';

/**
 * NEXORA — ProfileConnectionAction.
 *
 * Renders the correct connection action for a public profile based on
 * the semantic status returned by the backend:
 *
 *   none             → "Connect"   (sends a request)
 *   outgoing_pending → "Withdraw"  (withdraws the caller's request)
 *   incoming_pending → "Accept"    (recipient accepts)
 *   connected        → "Remove"    (removes the accepted connection)
 *
 * Self-profiles never render this component — ProfilePage only mounts it
 * for /profile/:userId when the URL user differs from the auth user.
 *
 * The slice caches `connectionId` alongside the semantic status so the
 * mutation can be dispatched immediately, without re-listing.
 */
function ProfileConnectionAction({ targetUserId }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();

  const isSelfProfile =
    authUser && String(authUser.id) === String(targetUserId);

  const relationship = useSelector(selectConnectionRelationship(targetUserId));
  const isStatusLoading = useSelector(selectIsStatusLoading(targetUserId));
  const mutationLoading = useSelector(selectMutationLoading);
  const mutationError = useSelector(selectMutationError);

  // Fetch on mount / when targetUserId changes.
  useEffect(() => {
    if (!targetUserId || isSelfProfile) return undefined;
    dispatch(fetchStatus(targetUserId));
  }, [dispatch, targetUserId, isSelfProfile]);

  if (isSelfProfile) return null;

  // Loading placeholder so the layout doesn't jump when the action
  // appears.
  const status = relationship?.status ?? null;
  const connectionId = relationship?.connectionId ?? null;
  if (status === null && isStatusLoading) {
    return (
      <div
        className="h-9 w-32 animate-pulse rounded-md bg-slate-200"
        aria-hidden="true"
      />
    );
  }

  function refresh() {
    dispatch(fetchStatus(targetUserId));
  }

  function handleSend() {
    dispatch(sendRequest(targetUserId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') refresh();
    });
  }

  function handleWithdraw() {
    if (!connectionId) return;
    dispatch(withdrawRequest(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') refresh();
    });
  }

  function handleAccept() {
    if (!connectionId) return;
    dispatch(acceptRequest(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') refresh();
    });
  }

  function handleRemove() {
    if (!connectionId) return;
    dispatch(removeConnectionAction(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {status === 'none' && (
        <ConnectionActionButton
          type="button"
          variant="primary"
          isBusy={mutationLoading}
          onClick={handleSend}
          aria-label="Send connection request"
        >
          Connect
        </ConnectionActionButton>
      )}

      {status === 'outgoing_pending' && (
        <ConnectionActionButton
          type="button"
          variant="secondary"
          isBusy={mutationLoading}
          onClick={handleWithdraw}
          aria-label="Withdraw pending connection request"
        >
          Pending · Withdraw
        </ConnectionActionButton>
      )}

      {status === 'incoming_pending' && (
        <ConnectionActionButton
          type="button"
          variant="primary"
          isBusy={mutationLoading}
          onClick={handleAccept}
          aria-label="Accept pending connection request"
        >
          Accept
        </ConnectionActionButton>
      )}

      {status === 'connected' && (
        <ConnectionActionButton
          type="button"
          variant="secondary"
          isBusy={mutationLoading}
          onClick={handleRemove}
          aria-label="Remove this connection"
        >
          Connected · Remove
        </ConnectionActionButton>
      )}

      {mutationError ? (
        <p
          role="alert"
          className="max-w-[16rem] text-right text-xs text-rose-700"
        >
          {mutationError}
        </p>
      ) : null}
    </div>
  );
}

export default ProfileConnectionAction;
