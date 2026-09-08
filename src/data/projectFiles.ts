export interface ProjectFile {
  path: string;
  folder: 'backend' | 'frontend';
  filename: string;
  language: string;
  description: string;
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  {
    path: 'backend/models/User.js',
    folder: 'backend',
    filename: 'User.js',
    language: 'javascript',
    description: 'Mongoose schema and model definition enforcing unique lowercase email and subscriber access permission.',
    content: `const mongoose = require('mongoose');

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
        /^\\w+([.-]?\\w+)*@\\w+([.-]?\\w+)*(\\.\\w{2,3})+$/,
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
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);`
  },
  {
    path: 'backend/api/index.js',
    folder: 'backend',
    filename: 'index.js',
    language: 'javascript',
    description: 'Vercel Serverless Function entry point with cached MongoDB connection, POST /api/login, and protected GET /api/pages.',
    content: `require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('../models/User');

const app = express();

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
  res.status(200).json({
    status: 'online',
    service: 'Digital Book Publishing API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/**
 * POST /api/login
 * Body: { email }
 * Verifies email exists in MongoDB and hasAccess === true.
 * Returns signed JWT token on success.
 */
app.post('/api/login', ensureDbConnection, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user in MongoDB
    const user = await User.findOne({ email: normalizedEmail });

    // Validate existence and access permission
    if (!user || user.hasAccess !== true) {
      return res.status(401).json({
        error: 'Access denied. Account not authorized or reader access revoked.'
      });
    }

    // Sign JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is missing in environment variables');
      return res.status(500).json({
        error: 'Server configuration error: JWT secret missing.'
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
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
    console.log(\`Digital Book Publisher API running locally on http://localhost:\${PORT}\`);
  });
}

// Export for Vercel Serverless Function runtime
module.exports = app;`
  },
  {
    path: 'backend/vercel.json',
    folder: 'backend',
    filename: 'vercel.json',
    language: 'json',
    description: 'Vercel configuration routing all incoming traffic to the api/index.js serverless handler.',
    content: `{
  "version": 2,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.js"
    }
  ]
}`
  },
  {
    path: 'backend/package.json',
    folder: 'backend',
    filename: 'package.json',
    language: 'json',
    description: 'Node.js dependencies and run scripts for the Vercel Express serverless API.',
    content: `{
  "name": "digital-book-publisher-backend",
  "version": "1.0.0",
  "description": "Express serverless API for Digital Book Publishing platform deployed on Vercel",
  "main": "api/index.js",
  "scripts": {
    "start": "node api/index.js",
    "dev": "node api/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.4.0"
  },
  "engines": {
    "node": ">=18.x"
  }
}`
  },
  {
    path: 'backend/.env.example',
    folder: 'backend',
    filename: '.env.example',
    language: 'shell',
    description: 'Environment variable template for MongoDB Atlas URI and JWT secret key.',
    content: `# MongoDB Atlas Connection URI
# Example: mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/digital_books?retryWrites=true&w=majority
MONGODB_URI="mongodb+srv://admin:securepassword@cluster0.mongodb.net/book_publisher?retryWrites=true&w=majority"

# JSON Web Token Secret Key (use a secure random string of at least 32 characters in production)
JWT_SECRET="super_secret_digital_publishing_jwt_key_92834710928347"

# Local Development Port
PORT=5000`
  },
  {
    path: 'frontend/App.js',
    folder: 'frontend',
    filename: 'App.js',
    language: 'javascript',
    description: 'Expo React Native application featuring expo-screen-capture anti-screenshot protection, SecureStore persistence, LoginScreen, and full-width vertical FlatList ReaderScreen.',
    content: `import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl
} from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';

// Replace with your deployed Vercel backend URL or local IP address for physical device testing
const DEFAULT_API_URL = 'https://your-vercel-deployment.vercel.app';
const TOKEN_KEY = 'user_auth_token';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Main Application Entry Point
 */
export default function App() {
  const [token, setToken] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  // 1. SECURITY MANDATE: Prevent screen captures & recording immediately on mount
  useEffect(() => {
    let isSubscribed = true;

    async function activateSecurityGuard() {
      try {
        // Blocks screenshot captures and screen recording on Android (FLAG_SECURE)
        await ScreenCapture.preventScreenCaptureAsync();
        if (isSubscribed) {
          console.log('[Security] DRM Screen capture protection active.');
        }
      } catch (err) {
        console.warn('[Security] Screen capture protection warning:', err.message);
      }
    }

    activateSecurityGuard();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // 2. Check for existing persisted token in Expo SecureStore
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUrl = await SecureStore.getItemAsync('api_base_url');
        if (storedUrl) {
          setApiUrl(storedUrl);
        }
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (err) {
        console.error('[Auth] Failed to restore token from SecureStore:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    restoreSession();
  }, []);

  // Login handler
  const handleLoginSuccess = async (newToken, configuredUrl) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      if (configuredUrl) {
        await SecureStore.setItemAsync('api_base_url', configuredUrl);
        setApiUrl(configuredUrl);
      }
      setToken(newToken);
    } catch (err) {
      Alert.alert('Storage Error', 'Could not securely save your session token.');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
    } catch (err) {
      console.error('[Auth] Logout storage cleanup failed:', err);
      setToken(null);
    }
  };

  if (isLoadingAuth) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingText}>Initializing secure reader...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {token ? (
        <ReaderScreen
          token={token}
          apiUrl={apiUrl}
          onLogout={handleLogout}
        />
      ) : (
        <LoginScreen
          apiUrl={apiUrl}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * LOGIN SCREEN COMPONENT
 */
function LoginScreen({ apiUrl, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [customUrl, setCustomUrl] = useState(apiUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEndpointConfig, setShowEndpointConfig] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Validation Error', 'Please enter your registered subscriber email.');
      return;
    }

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = \`\${customUrl.replace(/\\/+$/, '')}/api/login\`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: trimmedEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || 'Access denied or server error.';
        Alert.alert('Authentication Failed', errorMsg);
        setIsSubmitting(false);
        return;
      }

      if (data?.token) {
        await onLoginSuccess(data.token, customUrl);
      } else {
        Alert.alert('Login Error', 'No authorization token returned by the server.');
      }
    } catch (err) {
      console.error('[Login] Network request error:', err);
      Alert.alert(
        'Connection Error',
        \`Could not reach backend at \${customUrl}. Check your internet connection or server URL.\`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoid}
    >
      <ScrollView
        contentContainerStyle={styles.loginScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginCard}>
          {/* Brand Emblem */}
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>📖</Text>
          </View>

          <Text style={styles.appTitle}>Digital Book Reader</Text>
          <Text style={styles.appSubtitle}>
            Secure subscriber manuscript & digital publication portal
          </Text>

          {/* Security Notice */}
          <View style={styles.securityNoticeBox}>
            <Text style={styles.securityNoticeIcon}>🛡️</Text>
            <Text style={styles.securityNoticeText}>
              Protected Content: Screen captures and screen recordings are strictly blocked.
            </Text>
          </View>

          {/* Email Input Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subscriber Email</Text>
            <TextInput
              style={styles.textInput}
              placeholder="reader@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
            />
          </View>

          {/* Start Reading Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Start Reading</Text>
            )}
          </TouchableOpacity>

          {/* Optional Endpoint Configuration for testing */}
          <TouchableOpacity
            style={styles.toggleConfigButton}
            onPress={() => setShowEndpointConfig(!showEndpointConfig)}
          >
            <Text style={styles.toggleConfigText}>
              {showEndpointConfig ? '▲ Hide Server Settings' : '▼ Configure Server URL'}
            </Text>
          </TouchableOpacity>

          {showEndpointConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>Vercel API Base URL</Text>
              <TextInput
                style={styles.configInput}
                placeholder="https://your-api.vercel.app"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                value={customUrl}
                onChangeText={setCustomUrl}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * READER SCREEN COMPONENT
 */
function ReaderScreen({ token, apiUrl, onLogout }) {
  const [pages, setPages] = useState([]);
  const [bookTitle, setBookTitle] = useState('Digital Book');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const fetchBookPages = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const endpoint = \`\${apiUrl.replace(/\\/+$/, '')}/api/pages\`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          Alert.alert('Session Expired', 'Your reading session has expired. Please log in again.');
          onLogout();
          return;
        }
        throw new Error(data?.error || 'Failed to retrieve book pages.');
      }

      setPages(data.pages || []);
      if (data.bookTitle) {
        setBookTitle(data.bookTitle);
      }
    } catch (err) {
      console.error('[Reader] Fetch error:', err);
      setLoadError(err.message || 'Unable to load book pages.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiUrl, token, onLogout]);

  useEffect(() => {
    fetchBookPages();
  }, [fetchBookPages]);

  // Render individual full-width book page in vertical list
  const renderBookPage = ({ item, index }) => {
    return (
      <View style={styles.pageCard}>
        {/* Page Top Header Bar */}
        <View style={styles.pageMetaBar}>
          <Text style={styles.pageLabel}>PAGE {item.pageNumber || index + 1}</Text>
          {item.title ? (
            <Text style={styles.pageSectionTitle} numberOfLines={1}>
              {item.title}
            </Text>
          ) : null}
        </View>

        {/* Full-width Book Page Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.pageImage}
            resizeMode="contain"
          />
        </View>

        {/* Page Footer Divider */}
        <View style={styles.pageFooter}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            {index + 1} of {pages.length}
          </Text>
          <View style={styles.footerLine} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.readerRoot}>
      {/* Top Application Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerBookTitle} numberOfLines={1}>
            {bookTitle}
          </Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {pages.length > 0 ? \`\${pages.length} Pages • DRM Active\` : 'DRM Active'}
            </Text>
          </View>
        </View>

        {/* Header Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Body */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Fetching encrypted book pages...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Load Pages</Text>
          <Text style={styles.errorDescription}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchBookPages()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pages}
          renderItem={renderBookPage}
          keyExtractor={(item, index) => (item.pageNumber ? \`page-\${item.pageNumber}\` : \`page-\${index}\`)}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchBookPages(true)}
              tintColor="#0f172a"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pages available in this publication.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

/**
 * STYLES
 */
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  keyboardAvoid: {
    flex: 1
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc'
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  logoIcon: {
    fontSize: 32
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  securityNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 24
  },
  securityNoticeIcon: {
    fontSize: 16,
    marginRight: 8
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    fontWeight: '500'
  },
  inputGroup: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8
  },
  textInput: {
    height: 50,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a'
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4
  },
  buttonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  toggleConfigButton: {
    marginTop: 18,
    alignSelf: 'center',
    padding: 8
  },
  toggleConfigText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  configBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  configLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6
  },
  configInput: {
    height: 42,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#334155'
  },
  readerRoot: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  headerBookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc'
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700'
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  flatListContent: {
    paddingVertical: 16
  },
  pageCard: {
    width: SCREEN_WIDTH,
    backgroundColor: '#0f172a',
    marginBottom: 24,
    alignItems: 'center'
  },
  pageMetaBar: {
    width: '92%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8'
  },
  pageSectionTitle: {
    fontSize: 12,
    color: '#94a3b8',
    maxWidth: '70%'
  },
  imageContainer: {
    width: '92%',
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: SCREEN_WIDTH * 1.3
  },
  pageImage: {
    width: '100%',
    height: SCREEN_WIDTH * 1.3,
    backgroundColor: '#0f172a'
  },
  pageFooter: {
    width: '92%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 12
  },
  footerText: {
    fontSize: 11,
    color: '#64748b'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8'
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6
  },
  errorDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14
  }
});`
  },
  {
    path: 'frontend/app.json',
    folder: 'frontend',
    filename: 'app.json',
    language: 'json',
    description: 'Expo application manifest configuring Android package, orientation, permissions, and native security plugins.',
    content: `{
  "expo": {
    "name": "Digital Book Reader",
    "slug": "digital-book-reader",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.digitalbook.reader"
    },
    "android": {
      "package": "com.digitalbook.reader",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "permissions": [
        "INTERNET"
      ]
    },
    "plugins": [
      "expo-screen-capture",
      "expo-secure-store"
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id-here"
      }
    }
  }
}`
  },
  {
    path: 'frontend/eas.json',
    folder: 'frontend',
    filename: 'eas.json',
    language: 'json',
    description: 'Expo Application Services configuration tailored for Android preview standalone APK compilation.',
    content: `{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}`
  },
  {
    path: 'frontend/package.json',
    folder: 'frontend',
    filename: 'package.json',
    language: 'json',
    description: 'React Native and Expo dependencies, including expo-screen-capture and expo-secure-store.',
    content: `{
  "name": "digital-book-reader",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-screen-capture": "~6.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-native": "0.74.1"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  },
  "private": true
}`
  }
];
