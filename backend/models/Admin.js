const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      default: 'Admin'
    },
    role: {
      type: String,
      default: 'admin'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
