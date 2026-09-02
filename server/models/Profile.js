/**
 * NEXORA — Profile model.
 *
 * Owns the *professional identity* of a user. Authentication identity lives
 * on the User model; this document is the public, editable professional
 * surface that the feed, search, and profile pages will read from.
 *
 * Why a separate collection (not embedded in User):
 *   - Keeps the auth hot path small (User stays focused on identity).
 *   - Lets the profile grow without bloating User documents.
 *   - Allows independent lifecycles (User changes rarely, Profile weekly).
 *   - Future Experience / Education / Skills collections will reference
 *     `this.user` rather than User; they need the Profile as a peer.
 *
 * Media references (`profilePhoto`, `coverPhoto`) are URL strings, not
 * uploads. The actual upload pipeline is intentionally deferred — see the
 * constitution's "no premature features" rule. The validator enforces an
 * http(s) scheme so a malicious user cannot store javascript: / data:
 * payloads that become stored-XSS on render.
 *
 * Future Experience / Education / Skills collections are NOT defined in
 * this prompt; their seams live here (one-to-many against `this.user`).
 */

const mongoose = require('mongoose');

const {
  MAX_HEADLINE_LENGTH,
  MAX_ABOUT_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_CURRENT_POSITION_LENGTH,
  MAX_INDUSTRY_LENGTH,
  MAX_URL_LENGTH,
} = require('../constants/profileFields');

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Profile must belong to a user'],
      // `unique: true` implies the index; no extra `schema.index()`.
      unique: true,
    },
    headline: {
      type: String,
      trim: true,
      default: '',
      maxlength: [
        MAX_HEADLINE_LENGTH,
        `Headline must be at most ${MAX_HEADLINE_LENGTH} characters`,
      ],
    },
    about: {
      type: String,
      trim: true,
      default: '',
      maxlength: [
        MAX_ABOUT_LENGTH,
        `About must be at most ${MAX_ABOUT_LENGTH} characters`,
      ],
    },
    location: {
      type: String,
      trim: true,
      default: '',
      maxlength: [
        MAX_LOCATION_LENGTH,
        `Location must be at most ${MAX_LOCATION_LENGTH} characters`,
      ],
    },
    currentPosition: {
      type: String,
      trim: true,
      default: '',
      maxlength: [
        MAX_CURRENT_POSITION_LENGTH,
        `Current position must be at most ${MAX_CURRENT_POSITION_LENGTH} characters`,
      ],
    },
    industry: {
      type: String,
      trim: true,
      default: '',
      maxlength: [
        MAX_INDUSTRY_LENGTH,
        `Industry must be at most ${MAX_INDUSTRY_LENGTH} characters`,
      ],
    },
    profilePhoto: {
      type: String,
      default: null,
      maxlength: [MAX_URL_LENGTH, 'profilePhoto URL is too long'],
    },
    coverPhoto: {
      type: String,
      default: null,
      maxlength: [MAX_URL_LENGTH, 'coverPhoto URL is too long'],
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

module.exports = mongoose.model('Profile', profileSchema);
