const mongoose = require('mongoose');

/**
 * User Schema for Digital Book Publishing Platform
 * 
 * Tracks authorized reader accounts and access entitlements.
 */
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    hasAccess: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent re-compilation during hot reloads / serverless invocations
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
