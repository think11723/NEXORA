/**
 * NEXORA — safe connection serializer.
 *
 * Connection documents are never returned raw. The serializer projects
 * the document down to the public surface and populates a small public
 * projection of both participants (request identity + profile preview)
 * so the frontend can render connection cards without a second
 * round-trip.
 *
 * The canonical pair (`userA`, `userB`) is an internal uniqueness
 * mechanism — it is NOT exposed by this serializer. Direction lives in
 * `requester` / `recipient` and that is all the API consumer needs.
 *
 * `status` is intentionally NOT exposed at the wire. The frontend
 * should rely on the separate `semantic` value (returned by the status
 * endpoint and embedded in future list responses) to render UI state.
 * This prevents the rejected/withdrawn history of a relationship from
 * leaking to the other party.
 *
 * Missing-user policy: if a connection references a User that has been
 * removed, the serializer returns a safe placeholder rather than
 * throwing. This is a data-integrity safety net; the rest of the
 * pipeline keeps working.
 */

const CONNECTION_FIELDS = [
  'id',
  'requester',
  'recipient',
  'createdAt',
  'updatedAt',
];

/**
 * Minimal user public projection.
 *
 * Never expose password, JWT, role, isActive, email, or arbitrary
 * profile fields beyond what the network UI needs to render a card.
 */
function userPublicProjection(user) {
  if (!user) return null;
  const obj = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const firstName = obj.firstName ?? '';
  const lastName = obj.lastName ?? '';
  return {
    id: obj._id?.toString?.() ?? obj.id ?? null,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
  };
}

/**
 * Minimal profile preview projection — name + headline + photo only.
 * The full Profile document is NEVER returned by the connection API.
 */
function profilePublicProjection(profile) {
  if (!profile) return null;
  const obj =
    typeof profile.toJSON === 'function' ? profile.toJSON() : { ...profile };
  return {
    headline: obj.headline ?? '',
    profilePhoto: obj.profilePhoto ?? null,
  };
}

function buildParticipant(participant) {
  // `participant` is the tuple-shaped value from the user / profile maps.
  // `null` represents a missing reference (deleted user). We surface that
  // as a placeholder rather than throwing so the rest of the API stays
  // working under data-integrity issues.
  if (!participant || !participant.user) {
    return {
      user: null,
      profile: null,
      placeholder: true,
    };
  }
  return {
    user: userPublicProjection(participant.user),
    profile: profilePublicProjection(participant.profile),
    placeholder: false,
  };
}

/**
 * Project a Connection document into its API shape.
 *
 * `participantMap` is a Map of userId → { user, profile } used to
 * populate requester/recipient identity and profile preview. Missing
 * participants are projected with `placeholder: true` so the frontend
 * can render a graceful fallback.
 */
function toSafeConnection(connection, participantMap) {
  if (!connection) return null;
  const obj =
    typeof connection.toJSON === 'function'
      ? connection.toJSON()
      : { ...connection };

  const requesterId =
    obj.requester?.toString?.() ?? String(obj.requester ?? '');
  const recipientId =
    obj.recipient?.toString?.() ?? String(obj.recipient ?? '');

  const map = participantMap instanceof Map ? participantMap : new Map();

  const safe = {};
  for (const key of CONNECTION_FIELDS) {
    if (obj[key] !== undefined) safe[key] = obj[key];
  }

  safe.id = obj.id ?? obj._id?.toString?.() ?? null;
  safe.requester = buildParticipant(map.get(requesterId));
  safe.recipient = buildParticipant(map.get(recipientId));
  return safe;
}

function toSafeConnectionList(connections, participantMap) {
  return connections.map((c) => toSafeConnection(c, participantMap));
}

/**
 * Project the caller's relationship with a target user into a simple
 * semantic status the frontend can render directly.
 *
 * Returns one of:
 *   "none"
 *   "outgoing_pending"   — caller sent a request awaiting response
 *   "incoming_pending"   — caller has a request awaiting their response
 *   "connected"          — both parties are connected
 *
 * `rejected` / `withdrawn` are not exposed as semantic states to the
 * caller from another user's perspective; the underlying document is
 * still tracked for auditability and re-request. The frontend sees
 * "none" for either of those historical states.
 *
 * Self-status: a caller querying their own userId receives "none"
 * because self-connections are rejected at the service layer.
 */
function semanticStatusFor(connection, callerId) {
  if (!connection) return 'none';
  const status = connection.status;
  if (status === 'accepted') return 'connected';

  const caller = String(callerId ?? '');
  const requester =
    connection.requester?.toString?.() ?? String(connection.requester ?? '');
  if (status === 'pending') {
    return caller === requester ? 'outgoing_pending' : 'incoming_pending';
  }
  return 'none';
}

module.exports = {
  toSafeConnection,
  toSafeConnectionList,
  semanticStatusFor,
  CONNECTION_FIELDS,
};
