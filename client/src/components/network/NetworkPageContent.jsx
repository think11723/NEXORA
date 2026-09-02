import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ConnectionActionButton from './ConnectionActionButton.jsx';
import ConnectionCard from './ConnectionCard.jsx';
import NetworkEmptyState from './NetworkEmptyState.jsx';
import NetworkErrorState from './NetworkErrorState.jsx';
import NetworkSkeleton from './NetworkSkeleton.jsx';
import NetworkTabs from './NetworkTabs.jsx';
import {
  acceptRequest,
  fetchConnections,
  fetchIncoming,
  fetchOutgoing,
  rejectRequest,
  removeConnectionAction,
  withdrawRequest,
} from '../../store/slices/connectionSlice.js';
import {
  selectAcceptedConnections,
  selectConnectionsError,
  selectConnectionsLoading,
  selectIncomingError,
  selectIncomingLoading,
  selectIncomingRequests,
  selectMutationLoading,
  selectOutgoingError,
  selectOutgoingLoading,
  selectOutgoingRequests,
} from '../../store/slices/connectionSlice.js';

/**
 * NEXORA — NetworkPageContent.
 *
 * Body of the Network page. Owns the active tab and dispatches the
 * three list thunks on mount + when the user switches tabs. Mutation
 * thunks (accept / reject / withdraw / remove) run server-confirmed:
 * after each successful mutation we re-fetch the affected lists so the
 * slice reflects authoritative server state.
 */

const TABS_BASE = [
  { id: 'connections', label: 'Connections' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Sent' },
];

function NetworkPageContent() {
  const dispatch = useDispatch();
  const [activeTabId, setActiveTabId] = useState('connections');

  const connections = useSelector(selectAcceptedConnections);
  const incoming = useSelector(selectIncomingRequests);
  const outgoing = useSelector(selectOutgoingRequests);

  const connectionsLoading = useSelector(selectConnectionsLoading);
  const incomingLoading = useSelector(selectIncomingLoading);
  const outgoingLoading = useSelector(selectOutgoingLoading);
  const mutationLoading = useSelector(selectMutationLoading);

  const connectionsError = useSelector(selectConnectionsError);
  const incomingError = useSelector(selectIncomingError);
  const outgoingError = useSelector(selectOutgoingError);

  // Fetch all three on mount so the tab badges are populated.
  useEffect(() => {
    dispatch(fetchConnections());
    dispatch(fetchIncoming());
    dispatch(fetchOutgoing());
  }, [dispatch]);

  // Refetch the active tab when the user switches to it.
  useEffect(() => {
    if (activeTabId === 'connections') dispatch(fetchConnections());
    if (activeTabId === 'incoming') dispatch(fetchIncoming());
    if (activeTabId === 'outgoing') dispatch(fetchOutgoing());
  }, [activeTabId, dispatch]);

  const tabs = useMemo(
    () =>
      TABS_BASE.map((t) => ({
        ...t,
        count:
          t.id === 'connections'
            ? connections.length
            : t.id === 'incoming'
              ? incoming.length
              : outgoing.length,
      })),
    [connections.length, incoming.length, outgoing.length]
  );

  function handleAccept(connectionId) {
    dispatch(acceptRequest(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        // Reconcile: remove from incoming, refresh accepted list.
        dispatch(fetchIncoming());
        dispatch(fetchConnections());
      }
    });
  }

  function handleReject(connectionId) {
    dispatch(rejectRequest(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        dispatch(fetchIncoming());
      }
    });
  }

  function handleWithdraw(connectionId) {
    dispatch(withdrawRequest(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        dispatch(fetchOutgoing());
      }
    });
  }

  function handleRemove(connectionId, partnerUserId) {
    dispatch(removeConnectionAction(connectionId)).then((action) => {
      if (action.meta.requestStatus === 'fulfilled') {
        dispatch(fetchConnections());
        // The cached status for the partner is now stale; invalidate so
        // the next viewer (the profile page) refetches.
        if (partnerUserId) {
          dispatch({
            type: 'connection/clearStatusFor',
            payload: partnerUserId,
          });
        }
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Network</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your connections and respond to pending requests.
        </p>
      </header>

      <NetworkTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
      />

      <div
        role="tabpanel"
        id={`network-panel-${activeTabId}`}
        aria-labelledby={`network-tab-${activeTabId}`}
        className="mt-6"
      >
        {activeTabId === 'connections' && (
          <ConnectionsPanel
            items={connections}
            isLoading={connectionsLoading}
            error={connectionsError}
            mutationLoading={mutationLoading}
            onRetry={() => dispatch(fetchConnections())}
            onRemove={handleRemove}
          />
        )}
        {activeTabId === 'incoming' && (
          <IncomingPanel
            items={incoming}
            isLoading={incomingLoading}
            error={incomingError}
            mutationLoading={mutationLoading}
            onRetry={() => dispatch(fetchIncoming())}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
        {activeTabId === 'outgoing' && (
          <OutgoingPanel
            items={outgoing}
            isLoading={outgoingLoading}
            error={outgoingError}
            mutationLoading={mutationLoading}
            onRetry={() => dispatch(fetchOutgoing())}
            onWithdraw={handleWithdraw}
          />
        )}
      </div>
    </div>
  );
}

function ConnectionsPanel({
  items,
  isLoading,
  error,
  mutationLoading,
  onRetry,
  onRemove,
}) {
  if (isLoading && items.length === 0) return <NetworkSkeleton count={3} />;
  if (error && items.length === 0) {
    return <NetworkErrorState message={error} onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <NetworkEmptyState
        title="No connections yet"
        body="Start growing your network by visiting profiles and sending connection requests."
        testId="network-connections-empty"
      />
    );
  }
  return (
    <ul className="space-y-3" aria-label="Your connections">
      {items.map((item) => (
        <li key={item.id ?? `${item.user?.id}`}>
          <ConnectionCard item={item}>
            <ConnectionActionButton
              variant="secondary"
              isBusy={mutationLoading}
              onClick={() => onRemove(item.id, item.user?.id)}
              aria-label={`Remove connection with ${item.user?.fullName ?? 'this user'}`}
            >
              Remove
            </ConnectionActionButton>
          </ConnectionCard>
        </li>
      ))}
    </ul>
  );
}

function IncomingPanel({
  items,
  isLoading,
  error,
  mutationLoading,
  onRetry,
  onAccept,
  onReject,
}) {
  if (isLoading && items.length === 0) return <NetworkSkeleton count={2} />;
  if (error && items.length === 0) {
    return <NetworkErrorState message={error} onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <NetworkEmptyState
        title="No incoming requests"
        body="You'll see connection requests from other NEXORA members here."
        testId="network-incoming-empty"
      />
    );
  }
  return (
    <ul className="space-y-3" aria-label="Incoming connection requests">
      {items.map((item) => (
        <li key={item.id ?? `${item.user?.id}`}>
          <ConnectionCard item={item}>
            <ConnectionActionButton
              variant="primary"
              isBusy={mutationLoading}
              onClick={() => onAccept(item.id)}
              aria-label={`Accept request from ${item.user?.fullName ?? 'this user'}`}
            >
              Accept
            </ConnectionActionButton>
            <ConnectionActionButton
              variant="danger"
              isBusy={mutationLoading}
              onClick={() => onReject(item.id)}
              aria-label={`Reject request from ${item.user?.fullName ?? 'this user'}`}
            >
              Ignore
            </ConnectionActionButton>
          </ConnectionCard>
        </li>
      ))}
    </ul>
  );
}

function OutgoingPanel({
  items,
  isLoading,
  error,
  mutationLoading,
  onRetry,
  onWithdraw,
}) {
  if (isLoading && items.length === 0) return <NetworkSkeleton count={2} />;
  if (error && items.length === 0) {
    return <NetworkErrorState message={error} onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <NetworkEmptyState
        title="No sent requests"
        body="Requests you send to other NEXORA members will appear here until they respond."
        testId="network-outgoing-empty"
      />
    );
  }
  return (
    <ul className="space-y-3" aria-label="Sent connection requests">
      {items.map((item) => (
        <li key={item.id ?? `${item.user?.id}`}>
          <ConnectionCard item={item}>
            <ConnectionActionButton
              variant="secondary"
              isBusy={mutationLoading}
              onClick={() => onWithdraw(item.id)}
              aria-label={`Withdraw request to ${item.user?.fullName ?? 'this user'}`}
            >
              Withdraw
            </ConnectionActionButton>
          </ConnectionCard>
        </li>
      ))}
    </ul>
  );
}

export default NetworkPageContent;
