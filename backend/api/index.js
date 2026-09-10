require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Admin = require('../models/Admin');
const Book = require('../models/Book');
const BookPage = require('../models/BookPage');
const app = express();

const DEMO_ALLOWED_EMAILS = new Set(['subscriber@digitalpublishing.com', 'reader@example.com']);
const DEMO_REVOKED_EMAILS = new Set(['revoked@expired.com']);
const ADMIN_EMAIL = 'hafiz@gmail.com';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));

let cachedDb = global.mongoose;
if (!cachedDb) {
  cachedDb = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  if (cachedDb.conn) {
    return cachedDb.conn;
  }

  if (!cachedDb.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000
    };

    cachedDb.promise = mongoose.connect(uri, opts).then((mongooseInstance) => mongooseInstance);
  }

  try {
    cachedDb.conn = await cachedDb.promise;
  } catch (error) {
    cachedDb.promise = null;
    throw error;
  }

  return cachedDb.conn;
}

async function ensureDefaultAdmin() {
  await connectToDatabase();
  let admin = await Admin.findOne({ email: ADMIN_EMAIL }).lean();
  if (!admin) {
    admin = await Admin.create({
      email: ADMIN_EMAIL,
      name: 'Hafiz Admin',
      role: 'admin',
      isActive: true
    });
  }
  return admin;
}

async function ensureDefaultBook() {
  await connectToDatabase();
  let book = await Book.findOne({ slug: 'book-1' }).lean();
  if (!book) {
    book = await Book.create({
      title: 'Book 1',
      slug: 'book-1',
      description: 'Primary digital book',
      coverImage: '',
      isActive: true,
      pageCount: 0
    });
  }
  return book;
}

function withAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authorization required.' });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'local-dev-secret-key';

  jwt.verify(token, jwtSecret, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired admin session.' });
    }

    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized admin account.' });
    }

    req.admin = decoded;
    next();
  });
}

async function getBookRecord(bookIdentifier) {
  await connectToDatabase();

  if (mongoose.Types.ObjectId.isValid(bookIdentifier)) {
    return Book.findById(bookIdentifier).lean();
  }

  return Book.findOne({ slug: bookIdentifier }).lean();
}

async function ensureBookPageEntriesForBook(bookKey) {
  const pages = await BookPage.find({ bookId: bookKey }).sort({ pageNumber: 1, _id: 1 }).lean();
  const total = pages.length;
  await Book.findOneAndUpdate({ slug: bookKey }, { pageCount: total }, { upsert: true, new: true });
  return pages;
}

app.get('/api/health', (req, res) => {
  const readyState = cachedDb.conn && cachedDb.conn.connection ? cachedDb.conn.connection.readyState : mongoose.connection.readyState;

  res.status(200).json({
    status: 'online',
    service: 'Digital Book Publishing API',
    database: readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.post('/api/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = null;

    try {
      await connectToDatabase();
      user = await User.findOne({ email: normalizedEmail }).lean();
    } catch (dbError) {
      console.warn('MongoDB unavailable for login; using demo fallback auth.', dbError.message);
      if (DEMO_ALLOWED_EMAILS.has(normalizedEmail)) {
        user = { email: normalizedEmail, hasAccess: true };
      } else if (DEMO_REVOKED_EMAILS.has(normalizedEmail)) {
        user = { email: normalizedEmail, hasAccess: false };
      }
    }

    if (!user || user.hasAccess !== true) {
      return res.status(401).json({
        error: 'Access denied. Account not authorized or reader access revoked.'
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'local-dev-secret-key';
    const token = jwt.sign(
      {
        userId: user._id || `demo_${normalizedEmail.replace(/[^a-z0-9]/gi, '')}`,
        email: user.email,
        hasAccess: user.hasAccess
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        email: user.email,
        hasAccess: user.hasAccess
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An internal server error occurred during authentication.' });
  }
});

app.get('/api/pages', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed. Format: Bearer <token>' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'local-dev-secret-key';

    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
      }

      if (decoded.hasAccess === false) {
        return res.status(403).json({ error: 'Reader subscription inactive.' });
      }

      try {
        await connectToDatabase();
        const pages = await BookPage.find({
          $or: [
            { bookId: 'book1' },
            { bookId: 'book-1' },
            { bookId: { $exists: false } }
          ],
          imageUrl: { $exists: true, $ne: '' }
        })
          .sort({ pageNumber: 1, _id: 1 })
          .lean();

        if (!pages || pages.length === 0) {
          return res.status(404).json({
            error: 'No pages uploaded for this book yet. Add images to MongoDB collection book1.'
          });
        }

        return res.status(200).json({
          bookTitle: 'Book 1',
          totalPages: pages.length,
          pages: pages.map((page, index) => ({
            _id: page._id,
            pageNumber: page.pageNumber ?? index + 1,
            title: page.title || `Page ${page.pageNumber ?? index + 1}`,
            imageUrl: page.imageUrl
          }))
        });
      } catch (dbError) {
        console.error('Fetch pages from MongoDB failed:', dbError);
        return res.status(500).json({ error: 'Unable to load book pages from database.' });
      }
    });
  } catch (error) {
    console.error('Pages error:', error);
    return res.status(500).json({ error: 'An internal server error occurred while retrieving book pages.' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Admin email is required.' });
    }

    await ensureDefaultAdmin();

    await connectToDatabase();
    const admin = await Admin.findOne({ email: normalizedEmail, isActive: true }).lean();

    if (!admin || normalizedEmail !== ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Access denied. Only hafiz@gmail.com can access the admin panel.' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'local-dev-secret-key';
    const token = jwt.sign(
      {
        userId: admin._id,
        email: admin.email,
        role: 'admin'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      admin: {
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Unable to authenticate admin.' });
  }
});

app.get('/api/admin/books', withAdminAuth, async (req, res) => {
  try {
    await connectToDatabase();
    let books = await Book.find({}).sort({ createdAt: -1 }).lean();

    if (!books.length) {
      const defaultBook = await ensureDefaultBook();
      books = [defaultBook];
    }

    return res.status(200).json({ books });
  } catch (error) {
    console.error('List books error:', error);
    return res.status(500).json({ error: 'Unable to load books.' });
  }
});

app.get('/api/admin/books/:bookId/pages', withAdminAuth, async (req, res) => {
  try {
    const book = await getBookRecord(req.params.bookId);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const bookKey = book.slug || String(book._id);
    const pages = await BookPage.find({
      $or: [
        { bookId: bookKey },
        { bookId: String(book._id) },
        { bookId: 'book1' },
        { bookId: 'book-1' }
      ]
    })
      .sort({ pageNumber: 1, _id: 1 })
      .lean();

    return res.status(200).json({ book, pages });
  } catch (error) {
    console.error('List book pages error:', error);
    return res.status(500).json({ error: 'Unable to load pages for this book.' });
  }
});

app.post('/api/admin/books/:bookId/pages', withAdminAuth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { imageData, imageUrl, pageNumber, insertPosition = 'append', title } = req.body;

    if (!imageData && !imageUrl) {
      return res.status(400).json({ error: 'Please upload an image or provide a Cloudinary URL.' });
    }

    let uploadedUrl = imageUrl;
    const hasCloudinaryImageData = typeof imageData === 'string' && imageData.startsWith('data:image');

    if (hasCloudinaryImageData) {
      const uploadResult = await cloudinary.uploader.upload(imageData, {
        folder: 'digital-book-pages',
        resource_type: 'image'
      });
      uploadedUrl = uploadResult.secure_url;
    }

    if (!uploadedUrl) {
      return res.status(400).json({ error: 'Image upload did not return a valid URL.' });
    }

    let book = await getBookRecord(bookId);
    if (!book) {
      book = await ensureDefaultBook();
    }

    const bookKey = book.slug || 'book-1';
    const pages = await BookPage.find({ bookId: bookKey }).sort({ pageNumber: 1, _id: 1 }).lean();

    const targetPageNumber = Number(pageNumber) || pages.length + 1;
    let newPageNumber = targetPageNumber;

    if (insertPosition === 'before') {
      for (const page of pages) {
        if (Number(page.pageNumber) >= Number(targetPageNumber)) {
          await BookPage.findByIdAndUpdate(page._id, { pageNumber: Number(page.pageNumber) + 1 });
        }
      }
      newPageNumber = Number(targetPageNumber);
    } else if (insertPosition === 'after') {
      for (const page of pages) {
        if (Number(page.pageNumber) > Number(targetPageNumber)) {
          await BookPage.findByIdAndUpdate(page._id, { pageNumber: Number(page.pageNumber) + 1 });
        }
      }
      newPageNumber = Number(targetPageNumber) + 1;
    } else {
      newPageNumber = pages.length + 1;
    }

    const pageDoc = await BookPage.create({
      bookId: bookKey,
      pageNumber: newPageNumber,
      imageUrl: uploadedUrl,
      title: title || `Page ${newPageNumber}`,
      isActive: true
    });

    const updatedCount = await BookPage.countDocuments({ bookId: bookKey });
    await Book.findOneAndUpdate({ slug: bookKey }, { pageCount: updatedCount }, { new: true });

    return res.status(201).json({
      message: 'Page uploaded and saved.',
      page: {
        _id: pageDoc._id,
        bookId: pageDoc.bookId,
        pageNumber: pageDoc.pageNumber,
        imageUrl: pageDoc.imageUrl,
        title: pageDoc.title
      }
    });
  } catch (error) {
    console.error('Upload page error:', error);
    return res.status(500).json({ error: 'Unable to upload and save the page.' });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Digital Book Publisher API running locally on http://localhost:${PORT}`);
  });
}

module.exports = app;

// Export for Vercel Serverless Function runtime
module.exports = app;
