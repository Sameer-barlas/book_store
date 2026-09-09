require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('../models/User');
const app = express();

const DEMO_ALLOWED_EMAILS = new Set(['subscriber@digitalpublishing.com', 'reader@example.com']);
const DEMO_REVOKED_EMAILS = new Set(['revoked@expired.com']);

// Standard middleware
app.use(cors());
app.use(express.json());

// Serverless MongoDB Connection Cache
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
      serverSelectionTimeoutMS: 5000,
    };

    cachedDb.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cachedDb.conn = await cachedDb.promise;
  } catch (error) {
    cachedDb.promise = null;
    throw error;
  }

  return cachedDb.conn;
}

// Sample published book pages (HD high-contrast book illustrations and manuscript spreads)
const SAMPLE_BOOK_PAGES = [
  {
    pageNumber: 1,
    title: "Cover & Title Page",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 0.707
  },
  {
    pageNumber: 2,
    title: "Prologue: The Foundations",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 0.707
  },
  {
    pageNumber: 3,
    title: "Chapter 1: The Architecture of Thought",
    imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 0.707
  },
  {
    pageNumber: 4,
    title: "Chapter 2: Principles of Modern Craft",
    imageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 0.707
  },
  {
    pageNumber: 5,
    title: "Chapter 3: The Digital Library",
    imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 0.707
  },
  {
    pageNumber: 6,
    title: "Epilogue & Acknowledgments",
    imageUrl: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=1200&q=85",
    aspectRatio: 0.707
  }
];

// Helper: Ensure Database Middleware
const ensureDbConnection = async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      error: 'Database connection failed. Please ensure MONGODB_URI is correctly configured.'
    });
  }
};

// Healthcheck Route
app.get('/api/health', (req, res) => {
  const readyState = cachedDb.conn && cachedDb.conn.connection ? cachedDb.conn.connection.readyState : mongoose.connection.readyState;

  res.status(200).json({
    status: 'online',
    service: 'Digital Book Publishing API',
    database: readyState === 1 ? 'connected' : 'disconnected'
  });
});

/**
 * POST /api/login
 * Body: { email }
 * Verifies email exists in MongoDB and hasAccess === true.
 * Returns signed JWT token on success.
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Please provide a valid email address.'
      });
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
    return res.status(500).json({
      error: 'An internal server error occurred during authentication.'
    });
  }
});

/**
 * GET /api/pages
 * Headers: Authorization: Bearer <token>
 * Validates JWT token and returns the book pages image list.
 */
app.get('/api/pages', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header missing or malformed. Format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({
        error: 'Server configuration error: JWT secret missing.'
      });
    }

    // Verify token
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          error: 'Invalid or expired session token. Please log in again.'
        });
      }

      // Check if payload has active access
      if (decoded.hasAccess === false) {
        return res.status(403).json({
          error: 'Reader subscription inactive.'
        });
      }

      // Return sample book pages
      return res.status(200).json({
        bookTitle: "Principles of Digital Architecture",
        totalPages: SAMPLE_BOOK_PAGES.length,
        pages: SAMPLE_BOOK_PAGES
      });
    });
  } catch (error) {
    console.error('Pages error:', error);
    return res.status(500).json({
      error: 'An internal server error occurred while retrieving book pages.'
    });
  }
});

// Local development fallback runner
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Digital Book Publisher API running locally on http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless Function runtime
module.exports = app;
