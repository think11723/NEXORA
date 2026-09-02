/**
 * NEXORA — Connection model.
 *
 * One document per relationship between two users. Direction is tracked
 * via `requester` / `recipient`. The pair is canonicalized into
 * `userA` / `userB` so that a single compound unique index can enforce
 * pair uniqueness — including the simultaneous A→B and B→A race.
 *
 * Why a canonical pair:
 *   - A single unique index `{ userA: 1, userB: 1 }` is enough to
 *     guarantee there is never more than one relationship document
 *     between the same two users, regardless of which side initiated.
 *   - Status transitions are atomic on a single document; no
 *     transactions required.
 *   - The pair index supports efficient "list all relationships
 *     involving A" queries via two compound indexes
 *     (`{ userA, status, updatedAt }` + `{ userB, status, updatedAt }`).
 *
 * Status lifecycle is documented in PROJECT_CONSTITUTION.md.
 */

const mongoose = require('mongoose');

const STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
});

/**
 * Canonicalize a pair of ObjectIds into a deterministic (a, b) order.
 *
 * Normalizes via `mongoose.Types.ObjectId(...).toHexString()` so that
 * mixed-case inputs (which Mongoose itself accepts and stores in lowercase
 * hex) produce a stable pair regardless of how they were originally
 * supplied. This keeps the self-connection check, the E11000 catch, and
 * the canonical pair consistent even if a future caller bypasses the
 * route-layer ObjectId validation.
 *
 * The pair is unique regardless of direction; direction is preserved by
 * `requester` / `recipient`.
 */
function canonicalPair(userIdA, userIdB) {
  const toHex = (x) => new mongoose.Types.ObjectId(String(x)).toHexString();
  const a = toHex(userIdA);
  const b = toHex(userIdB);
  return a <= b ? [a, b] : [b, a];
}

const connectionSchema = new mongoose.Schema(
  {
    // Canonical pair — unique together.
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Direction.
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      required: true,
      default: STATUS.PENDING,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: false,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Indexes — every one is justified by a documented query pattern.
 *
 * 1. `{ userA: 1, userB: 1 }` UNIQUE
 *    Query:  findOne({ userA, userB }) — used by sendRequest and
 *            getStatusForCaller.
 *    Why:   enforces pair uniqueness at the database level — the single
 *            most important invariant in this model. The unique key
 *            collapses A→B and B→A to the same document so the
 *            simultaneous race can never produce two relationship rows.
 *
 * 2. `{ userA: 1, status: 1, updatedAt: -1 }`
 *    Query:  find({ $or: [{ userA: userId }, { userB: userId }],
 *                   status: 'accepted' })
 *            (listAcceptedForUser — when caller is the smaller id, this
 *             index covers the userA branch.)
 *    Why:   supports "list my accepted connections" with status filter
 *            and recency sort, half of the $or.
 *
 * 3. `{ userB: 1, status: 1, updatedAt: -1 }`
 *    Query:  same as above, when caller is the larger id.
 *    Why:   the other half of the $or.
 *
 * 4. `{ recipient: 1, status: 1, updatedAt: -1 }`
 *    Query:  find({ recipient: userId, status: 'pending' })
 *            (listIncomingPendingForUser)
 *    Why:   dedicated index for the incoming-list endpoint. Cannot reuse
 *            indexes 2/3 because those key on `userA`/`userB`, not on
 *            `recipient`.
 *
 * 5. `{ requester: 1, status: 1, updatedAt: -1 }`
 *    Query:  find({ requester: userId, status: 'pending' })
 *            (listOutgoingPendingForUser)
 *    Why:   dedicated index for the outgoing-list endpoint.
 */
connectionSchema.index({ userA: 1, userB: 1 }, { unique: true });
connectionSchema.index({ userA: 1, status: 1, updatedAt: -1 });
connectionSchema.index({ userB: 1, status: 1, updatedAt: -1 });
connectionSchema.index({ recipient: 1, status: 1, updatedAt: -1 });
connectionSchema.index({ requester: 1, status: 1, updatedAt: -1 });

// Static helpers exported for the service so pair normalization and the
// status enum live in exactly one place.
connectionSchema.statics.canonicalPair = canonicalPair;
connectionSchema.statics.STATUS = STATUS;

module.exports = mongoose.model('Connection', connectionSchema);
