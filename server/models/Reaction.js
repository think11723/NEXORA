/**
 * NEXORA — Reaction model.
 *
 * One document per (post, user, type) tuple. The unique compound index
 * `{ post, user, type }` is the database-level guarantee that prevents
 * duplicate likes from the same user on the same post. The application
 * layer is intentionally permissive (we catch E11000 and translate it
 * to a clean 200 idempotent response) but the database is the final
 * authority.
 *
 * For Phase 5 Prompt 3, the only supported `type` is `'like'`. Multiple
 * reaction types (celebrate, support, etc.) belong to a future phase
 * and would be added by extending the enum.
 */

const mongoose = require('mongoose');

const REACTION_TYPE = Object.freeze({
  LIKE: 'like',
});

const reactionSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Reaction must reference a post'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reaction must reference a user'],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(REACTION_TYPE),
      required: true,
      default: REACTION_TYPE.LIKE,
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
 * The most important index in this file.
 *   `{ post, user, type }` UNIQUE — prevents duplicate likes.
 *
 * Concurrency: when two simultaneous likes arrive for the same (post,
 * user) pair, MongoDB serializes the inserts and E11000 fires for the
 * loser. The service translates that into a clean 200 idempotent
 * response, so the frontend never has to know which insert "won".
 */
reactionSchema.index({ post: 1, user: 1, type: 1 }, { unique: true });

/**
 * Secondary index used by the aggregation pipeline in post.service for
 * the feed interaction summary: counts grouped by postId.
 */
reactionSchema.index({ post: 1, type: 1 });

reactionSchema.statics.REACTION_TYPE = REACTION_TYPE;

module.exports = mongoose.model('Reaction', reactionSchema);
module.exports.REACTION_TYPE = REACTION_TYPE;
