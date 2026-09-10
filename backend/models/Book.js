const mongoose = require('mongoose');

const BookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    coverImage: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    pageCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Book || mongoose.model('Book', BookSchema);
