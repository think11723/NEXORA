/**
 * NEXORA — Comment model.
 *
 * One document per comment. The post reference is indexed so the
 * "comments for this post" query (the dominant access pattern) is
 * served by an index-only scan. Sort order at the API layer is
 * `createdAt` ASC (oldest first) so the conversation reads naturally.
 *
 * For Phase 5 Prompt 3, edits, deletions, replies, mentions, and
 * comment-reactions are explicitly OUT of scope. The model therefore
 * stays minimal — just post + author + content + timestamps.
 */

const mongoose = require('mongoose');

const MAX_CONTENT_LENGTH = 1000;

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Comment must reference a post'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must reference an author'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment content cannot be empty'],
      maxlength: [
        MAX_CONTENT_LENGTH,
        `Comment content must be at most ${MAX_CONTENT_LENGTH} characters`,
      ],
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
 * Indexes:
 *   1. `{ post: 1, createdAt: 1 }` — primary query: list comments for a
 *      post in chronological (oldest-first) order. The sort is fully
 *      covered.
 *   2. `{ author: 1 }` — reserved for "comments by user X" listings
 *      (future profile-page comment tab). Not currently used by the
 *      Feed API but cheap and small; left in place so a future prompt
 *      doesn't have to add it online.
 */
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1 });

module.exports = mongoose.model('Comment', commentSchema);
module.exports.MAX_CONTENT_LENGTH = MAX_CONTENT_LENGTH;
