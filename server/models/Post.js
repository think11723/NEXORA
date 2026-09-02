/**
 * NEXORA — Post model.
 *
 * One document per professional post authored by a user. The schema is
 * deliberately minimal: it establishes identity (author), content, and a
 * visibility enum that can be extended later (e.g. connections-only) without
 * a migration. Likes / comments / shares / reactions / media are
 * INTENTIONALLY absent and will arrive in their own phases.
 *
 * Sort order is deterministic: `createdAt` descending, with `_id`
 * descending as the tie-breaker (ObjectId encodes a roughly monotonic
 * counter, so this is stable across same-millisecond writes).
 */

const mongoose = require('mongoose');

const VISIBILITY = Object.freeze({
  PUBLIC: 'public',
});

const MAX_CONTENT_LENGTH = 3000;

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      minlength: [1, 'Post content cannot be empty'],
      maxlength: [
        MAX_CONTENT_LENGTH,
        `Post content must be at most ${MAX_CONTENT_LENGTH} characters`,
      ],
    },
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      required: true,
      default: VISIBILITY.PUBLIC,
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
 * 1. `{ author: 1, createdAt: -1, _id: -1 }`
 *    Query: `find({ author }).sort({ createdAt: -1, _id: -1 })` for
 *    `GET /posts/me` and `GET /posts/user/:userId`. The trailing `_id`
 *    tie-break is part of the same compound index so the sort is fully
 *    covered.
 *
 * 2. `{ createdAt: -1, _id: -1 }`
 *    Query: feed's base `find({ author: { $in: [...] } })
 *    .sort({ createdAt: -1, _id: -1 })`. The leading `createdAt`
 *    tie-breaker is identical to index #1 and ensures the sort is
 *    covered even when many authors are in the feed.
 *
 * 3. `{ visibility: 1, createdAt: -1, _id: -1 }`
 *    Reserved for future visibility-based feeds (e.g. connections-only).
 *    All posts are `public` today, so this index is small but ready.
 */
postSchema.index({ author: 1, createdAt: -1, _id: -1 });
postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ visibility: 1, createdAt: -1, _id: -1 });

postSchema.statics.VISIBILITY = VISIBILITY;
postSchema.statics.MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH;

module.exports = mongoose.model('Post', postSchema);
module.exports.MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH;
module.exports.VISIBILITY = VISIBILITY;
