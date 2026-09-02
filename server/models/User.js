/**
 * NEXORA — User model.
 *
 * Authentication + identity foundation only.
 * Future phases will introduce experience, education, connections, posts,
 * etc. via additional collections referenced from this document. Do NOT
 * speculatively add LinkedIn-style profile fields here.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

const DEFAULT_ROLE = ROLES.USER;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [60, 'First name must be at most 60 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [60, 'Last name must be at most 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email must be at most 254 characters'],
      match: [EMAIL_PATTERN, 'Email format is invalid'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // Hidden from default query results. Auth flows explicitly select it.
      select: false,
      minlength: [8, 'Password must be at least 8 characters'],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: DEFAULT_ROLE,
      // Role must never be settable from a public request body.
      // Public registration always produces a USER.
    },
    isActive: {
      type: Boolean,
      default: true,
      // Account-status flag. Inactive accounts are blocked from
      // authenticating. The field is server-controlled.
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
        delete ret.password;
        return ret;
      },
    },
  }
);

// Email uniqueness is enforced by `unique: true` on the field above,
// which already creates the necessary MongoDB index. No extra
// schema.index() is needed and would warn as a duplicate.

/**
 * Hash the password before persistence when it has been (re)assigned.
 *
 * `select: false` keeps the hash out of normal query results; this hook
 * still runs because the document already holds the value during save.
 */
userSchema.pre('save', async function hashPasswordIfModified(next) {
  if (!this.isModified('password')) return next();
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

/**
 * Instance method: compare a candidate plaintext against the stored hash.
 * Used by the login flow. Always select('+password') before calling.
 */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) {
    return Promise.reject(
      new Error('comparePassword called without a loaded password hash')
    );
  }
  return bcrypt.compare(candidate, this.password);
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
