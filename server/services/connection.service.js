/**
 * NEXORA — connection service.
 *
 * Owns the connection state machine. Controllers stay thin; routes
 * authenticate + validate; this service decides what is and isn't a
 * legal transition.
 *
 * Concurrency model:
 *   - sendRequest: try-insert + E11000 fallback. The unique index on
 *     (userA, userB) is the final guard. Refreshes of rejected/withdrawn
 *     docs use a single atomic findOneAndUpdate so the load-then-write
 *     race cannot cause VersionError 500s.
 *   - accept / reject / withdraw / remove: each is a single atomic
 *     findOneAndUpdate with both a status filter and an actor filter.
 *     If the atomic update misses, we re-read the doc to disambiguate
 *     404 vs 403 vs 409. The state we observe in the disambiguating
 *     read is a snapshot — if it has changed in the meantime, we
 *     return the appropriate error based on what we see.
 *
 * Race conditions:
 *   - A→B and B→A simultaneous: both writes target the same canonical
 *     pair (userA, userB); the unique index lets only one through. The
 *     loser catches E11000 and is translated into a 409.
 *   - Two simultaneous A→B requests: the second insert hits the same
 *     unique key; same handling.
 *   - Two simultaneous accept requests: the first wins (status moves
 *     from pending to accepted), the second sees status='accepted' and
 *     is told the connection cannot be accepted in its current state.
 *
 * Inactive user policy:
 *   The recipient's `isActive` is enforced by the existing requireAuth
 *   middleware. A caller that is inactive cannot authenticate. The
 *   recipient in a connection request may be inactive when the request
 *   is sent — the request is allowed so the relationship survives if
 *   the user is later reactivated.
 *
 * Self-status: a caller querying `GET /connections/status/<ownUserId>`
 * receives `"none"`. Self-connections are rejected at the service layer
 * (no document is ever created for the self-pair), so the lookup never
 * finds a document and the semantic serializer returns "none".
 *
 * Missing-user safety: if a connection references a User that has been
 * removed, the service does not throw. The serializer projects a safe
 * placeholder for that participant (see `safeConnection.js`).
 */

const mongoose = require('mongoose');

const Connection = require('../models/Connection');
const User = require('../models/User');
const Profile = require('../models/Profile');
const ApiError = require('../utils/ApiError');

const STATUS = Connection.STATUS;
const { canonicalPair } = Connection;

/**
 * Throw an ApiError describing the current relationship state when the
 * caller attempts to send a new request. Throws only for `accepted`
 * and `pending` states. Returns `false` when the existing record is
 * `rejected` or `withdrawn` (re-request is allowed).
 */
function conflictForExisting(existing, requesterId) {
  if (existing.status === STATUS.ACCEPTED) {
    throw ApiError.conflict('You are already connected to this user.');
  }
  if (existing.status === STATUS.PENDING) {
    if (String(existing.requester) === String(requesterId)) {
      throw ApiError.conflict(
        'You already have a pending request to this user.'
      );
    }
    throw ApiError.conflict('This user has already sent you a request.');
  }
  // rejected / withdrawn → caller may refresh the existing record.
  return false;
}

/**
 * Send a connection request from `requesterId` to `targetId`.
 *
 * Validates:
 *   - target is a valid ObjectId
 *   - target is not the requester
 *   - target user exists
 *
 * Race-handling:
 *   - refresh (rejected/withdrawn -> pending): single atomic
 *     findOneAndUpdate keyed on the current status.
 *   - insert (no doc): single Connection.create. The unique index
 *     enforces pair uniqueness; E11000 is translated to 409.
 */
async function sendRequest(requesterId, targetId) {
  if (
    typeof targetId !== 'string' ||
    !mongoose.Types.ObjectId.isValid(targetId)
  ) {
    throw ApiError.badRequest('Invalid user id');
  }
  if (String(requesterId) === String(targetId)) {
    throw ApiError.badRequest(
      'You cannot send a connection request to yourself.'
    );
  }

  const target = await User.findById(targetId).select('_id');
  if (!target) throw ApiError.notFound('User not found');

  const [userA, userB] = canonicalPair(requesterId, targetId);

  // Atomic refresh — only matches if the existing doc is rejected or
  // withdrawn. No race window: a single MongoDB round-trip.
  const refreshed = await Connection.findOneAndUpdate(
    { userA, userB, status: { $in: [STATUS.REJECTED, STATUS.WITHDRAWN] } },
    {
      $set: {
        status: STATUS.PENDING,
        requester: requesterId,
        recipient: targetId,
      },
    },
    { new: true }
  );

  if (refreshed) return refreshed;

  // Either no doc exists or it's pending/accepted. Try insert.
  try {
    return await Connection.create({
      userA,
      userB,
      requester: requesterId,
      recipient: targetId,
      status: STATUS.PENDING,
    });
  } catch (err) {
    if (err && err.code === 11000) {
      // Lost the race. Fetch to disambiguate.
      const existing = await Connection.findOne({ userA, userB });
      if (existing) {
        return conflictForExisting(existing, requesterId);
      }
      throw ApiError.conflict('A connection relationship already exists.');
    }
    throw err;
  }
}

/**
 * Disambiguate why an atomic transition missed.
 *
 * Returns the appropriate ApiError. Used after `findOneAndUpdate`
 * filters (status + actor) miss so we can give the caller an actionable
 * 404 / 403 / 409 instead of a generic failure.
 */
async function explainMissedTransition(
  connectionId,
  callerId,
  expectedStatus,
  actorField
) {
  const existing = await Connection.findById(connectionId);
  if (!existing) {
    throw ApiError.notFound('Connection not found');
  }
  if (actorField && String(existing[actorField]) !== String(callerId)) {
    const label =
      actorField === 'recipient'
        ? 'Only the recipient can perform this action.'
        : actorField === 'requester'
          ? 'Only the requester can perform this action.'
          : 'You are not part of this connection.';
    throw ApiError.forbidden(label);
  }
  throw ApiError.conflict(
    `Only ${expectedStatus} connections can perform this action.`
  );
}

async function acceptRequest(connectionId, callerId) {
  const updated = await Connection.findOneAndUpdate(
    { _id: connectionId, status: STATUS.PENDING, recipient: callerId },
    { $set: { status: STATUS.ACCEPTED } },
    { new: true }
  );
  if (updated) return updated;
  await explainMissedTransition(
    connectionId,
    callerId,
    STATUS.PENDING,
    'recipient'
  );
}

async function rejectRequest(connectionId, callerId) {
  const updated = await Connection.findOneAndUpdate(
    { _id: connectionId, status: STATUS.PENDING, recipient: callerId },
    { $set: { status: STATUS.REJECTED } },
    { new: true }
  );
  if (updated) return updated;
  await explainMissedTransition(
    connectionId,
    callerId,
    STATUS.PENDING,
    'recipient'
  );
}

async function withdrawRequest(connectionId, callerId) {
  const updated = await Connection.findOneAndUpdate(
    { _id: connectionId, status: STATUS.PENDING, requester: callerId },
    { $set: { status: STATUS.WITHDRAWN } },
    { new: true }
  );
  if (updated) return updated;
  await explainMissedTransition(
    connectionId,
    callerId,
    STATUS.PENDING,
    'requester'
  );
}

async function removeConnection(connectionId, callerId) {
  // Either party may remove an accepted connection.
  const removed = await Connection.findOneAndDelete({
    _id: connectionId,
    status: STATUS.ACCEPTED,
    $or: [{ requester: callerId }, { recipient: callerId }],
  });
  if (removed) {
    return { removed: true, id: connectionId };
  }
  // Disambiguate why the delete missed.
  const existing = await Connection.findById(connectionId);
  if (!existing) {
    throw ApiError.notFound('Connection not found');
  }
  const cid = String(callerId);
  if (
    cid !== String(existing.requester) &&
    cid !== String(existing.recipient)
  ) {
    throw ApiError.forbidden('You are not part of this connection.');
  }
  throw ApiError.conflict('Only accepted connections can be removed.');
}

/**
 * Fetch the caller's relationship status with another user.
 */
async function getStatusForCaller(callerId, targetId) {
  if (
    typeof targetId !== 'string' ||
    !mongoose.Types.ObjectId.isValid(targetId)
  ) {
    throw ApiError.badRequest('Invalid user id');
  }
  const [userA, userB] = canonicalPair(callerId, targetId);
  return Connection.findOne({ userA, userB });
}

/**
 * Fetch all accepted connections involving the caller.
 */
async function listAcceptedForUser(userId) {
  return Connection.find({
    $or: [{ userA: userId }, { userB: userId }],
    status: STATUS.ACCEPTED,
  }).sort({ updatedAt: -1 });
}

async function listIncomingPendingForUser(userId) {
  return Connection.find({
    recipient: userId,
    status: STATUS.PENDING,
  }).sort({ updatedAt: -1 });
}

async function listOutgoingPendingForUser(userId) {
  return Connection.find({
    requester: userId,
    status: STATUS.PENDING,
  }).sort({ updatedAt: -1 });
}

/**
 * Batched lookup of users + their profiles for a list of connections.
 * Two queries total for the whole batch — no N+1 pattern.
 */
async function loadParticipantMap(connections) {
  const userIds = new Set();
  for (const c of connections) {
    userIds.add(String(c.requester));
    userIds.add(String(c.recipient));
  }
  if (userIds.size === 0) return new Map();

  const ids = [...userIds];
  const users = await User.find({ _id: { $in: ids } }).select(
    'firstName lastName'
  );
  const profiles = await Profile.find({ user: { $in: ids } }).select(
    'user headline profilePhoto'
  );

  const userById = new Map(users.map((u) => [String(u._id), u]));
  const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

  const map = new Map();
  for (const userId of userIds) {
    map.set(userId, {
      user: userById.get(userId) || null,
      profile: profileByUser.get(userId) || null,
    });
  }
  return map;
}

module.exports = {
  STATUS,
  canonicalPair,
  sendRequest,
  acceptRequest,
  rejectRequest,
  withdrawRequest,
  removeConnection,
  getStatusForCaller,
  listAcceptedForUser,
  listIncomingPendingForUser,
  listOutgoingPendingForUser,
  loadParticipantMap,
};
