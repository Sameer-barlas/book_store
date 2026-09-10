const mongoose = require('mongoose');

const BookPageSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      default: 'book1',
      index: true
    },
    pageNumber: {
      type: Number,
      required: true,
      index: true
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true
    },
    title: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    collection: 'book1',
    timestamps: true
  }
);

BookPageSchema.index({ bookId: 1, pageNumber: 1 }, { unique: false });

module.exports = mongoose.models.BookPage || mongoose.model('BookPage', BookPageSchema);
