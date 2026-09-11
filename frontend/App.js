import React, { useState, useEffect, useCallback } from 'react';
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

let ScreenCapture = null;
let SecureStore = null;
let ImagePicker = null;

try {
  ScreenCapture = require('expo-screen-capture');
} catch (err) {
  console.warn('[App] expo-screen-capture unavailable in this environment:', err.message);
}

try {
  SecureStore = require('expo-secure-store');
} catch (err) {
  console.warn('[App] expo-secure-store unavailable in this environment:', err.message);
}

try {
  ImagePicker = require('expo-image-picker');
} catch (err) {
  console.warn('[App] expo-image-picker unavailable in this environment:', err.message);
}

const secureStore = {
  async getItemAsync(key) {
    if (!SecureStore || typeof SecureStore.getItemAsync !== 'function') {
      return null;
    }
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key, value) {
    if (!SecureStore || typeof SecureStore.setItemAsync !== 'function') {
      return null;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key) {
    if (!SecureStore || typeof SecureStore.deleteItemAsync !== 'function') {
      return null;
    }
    return SecureStore.deleteItemAsync(key);
  }
};

// Local backend running on the PC for Expo testing. Use your PC LAN IP for physical Android device testing.
const DEFAULT_API_URL = 'http://172.31.61.80:5000';
const TOKEN_KEY = 'user_auth_token';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function normalizeApiUrl(value) {
  if (!value || typeof value !== 'string') {
    return DEFAULT_API_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_URL;
  }

  return trimmed.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

/**
 * Main Application Entry Point
 */
export default function App() {
  const [token, setToken] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);

  // 1. SECURITY MANDATE: Prevent screen captures & recording immediately on mount
  useEffect(() => {
    let isSubscribed = true;

    async function activateSecurityGuard() {
      try {
        if (!ScreenCapture || typeof ScreenCapture.preventScreenCaptureAsync !== 'function') {
          if (isSubscribed) {
            console.log('[Security] Screen capture protection unavailable in this environment.');
          }
          return;
        }

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
        const storedToken = await secureStore.getItemAsync(TOKEN_KEY);
        const storedUrl = await secureStore.getItemAsync('api_base_url');
        const normalizedStoredUrl = normalizeApiUrl(storedUrl);

        setApiUrl(normalizedStoredUrl);

        if (storedUrl && normalizedStoredUrl !== storedUrl) {
          await secureStore.setItemAsync('api_base_url', normalizedStoredUrl);
        }

        if (storedToken) {
          setToken(storedToken);
        }
      } catch (err) {
        console.error('[Auth] Failed to restore token from SecureStore:', err);
        setApiUrl(DEFAULT_API_URL);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    restoreSession();
  }, []);

  // Login handler
  const handleLoginSuccess = async (newToken, configuredUrl) => {
    try {
      const normalizedUrl = normalizeApiUrl(configuredUrl || apiUrl);
      await secureStore.setItemAsync(TOKEN_KEY, newToken);
      await secureStore.setItemAsync('api_base_url', normalizedUrl);
      setApiUrl(normalizedUrl);
      setToken(newToken);
      setAdminToken(null);
    } catch (err) {
      Alert.alert('Storage Error', 'Could not securely save your session token.');
    }
  };

  const handleAdminLoginSuccess = async (newAdminToken, configuredUrl) => {
    try {
      const normalizedUrl = normalizeApiUrl(configuredUrl || apiUrl);
      await secureStore.setItemAsync('admin_auth_token', newAdminToken);
      await secureStore.setItemAsync('api_base_url', normalizedUrl);
      setApiUrl(normalizedUrl);
      setAdminToken(newAdminToken);
      setToken(null);
    } catch (err) {
      Alert.alert('Storage Error', 'Could not securely save your admin session token.');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await secureStore.deleteItemAsync(TOKEN_KEY);
      await secureStore.deleteItemAsync('admin_auth_token');
    } catch (err) {
      console.error('[Auth] Logout storage cleanup failed:', err);
    }
    setToken(null);
    setAdminToken(null);
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
      {adminToken ? (
        <AdminPanelScreen
          token={adminToken}
          apiUrl={apiUrl}
          onLogout={handleLogout}
        />
      ) : token ? (
        <ReaderScreen
          token={token}
          apiUrl={apiUrl}
          onLogout={handleLogout}
        />
      ) : (
        <LoginScreen
          apiUrl={apiUrl}
          onLoginSuccess={handleLoginSuccess}
          onAdminLoginSuccess={handleAdminLoginSuccess}
        />
      )}
    </SafeAreaView>
  );
}

/**
 * LOGIN SCREEN COMPONENT
 */
function LoginScreen({ apiUrl, onLoginSuccess, onAdminLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [customUrl, setCustomUrl] = useState(apiUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEndpointConfig, setShowEndpointConfig] = useState(false);
  const [loginMode, setLoginMode] = useState('reader');

  const submitLogin = async (mode) => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert('Validation Error', mode === 'admin'
        ? 'Please enter the admin email.'
        : 'Please enter your registered subscriber email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const baseUrl = normalizeApiUrl(customUrl);
      const endpoint = `${baseUrl}/api/${mode === 'admin' ? 'admin/login' : 'login'}`;
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
        if (mode === 'admin') {
          await onAdminLoginSuccess(data.token, customUrl);
        } else {
          await onLoginSuccess(data.token, customUrl);
        }
      } else {
        Alert.alert('Login Error', 'No authorization token returned by the server.');
      }
    } catch (err) {
      console.error('[Login] Network request error:', err);
      Alert.alert(
        'Connection Error',
        `Could not reach backend at ${customUrl}. Check your internet connection or server URL.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => submitLogin(loginMode);
  const toggleLoginMode = () => setLoginMode((current) => current === 'admin' ? 'reader' : 'admin');

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
          <TouchableOpacity
            style={styles.logoBadge}
            onPress={toggleLoginMode}
            activeOpacity={0.8}
          >
            <Text style={styles.logoIcon}>📘</Text>
          </TouchableOpacity>

          <Text style={styles.kicker}>{loginMode === 'admin' ? 'Admin Access' : 'Reader Access'}</Text>
          <Text style={styles.appTitle}>{loginMode === 'admin' ? 'Admin panel' : 'Continue your reading'}</Text>
          <Text style={styles.appSubtitle}>
            {loginMode === 'admin'
              ? 'Use the admin email to manage books and page uploads.'
              : 'Sign in with your registered email to open your book.'}
          </Text>

          {!loginMode || loginMode === 'reader' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isSubmitting}
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admin Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder=""
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isSubmitting}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{loginMode === 'admin' ? 'Open Admin Panel' : 'Open Book'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleConfigButton}
            onPress={() => setShowEndpointConfig(!showEndpointConfig)}
          >
            <Text style={styles.toggleConfigText}>
              {showEndpointConfig ? 'Hide advanced settings' : 'Advanced server settings'}
            </Text>
          </TouchableOpacity>

          {showEndpointConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configLabel}>API Base URL</Text>
              <TextInput
                style={styles.configInput}
                placeholder="https://your-api.vercel.app"
                placeholderTextColor="#9aa3af"
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

function AdminPanelScreen({ token, apiUrl, onLogout }) {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [pages, setPages] = useState([]);
  const [bookTitle, setBookTitle] = useState('Book Manager');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pageNumber, setPageNumber] = useState('');

  const fetchBooks = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/admin/books`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to load books.');

      const nextBooks = data.books || [];
      setBooks(nextBooks);

      if (nextBooks.length > 0 && !selectedBookId) {
        setSelectedBookId(nextBooks[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Unable to load books.');
    }
  }, [apiUrl, token, selectedBookId]);

  const fetchBookPages = useCallback(async (bookId) => {
    if (!bookId) return;
    try {
      const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/admin/books/${bookId}/pages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to load book pages.');

      setPages(data.pages || []);
      if (data.book?.title) {
        setBookTitle(data.book.title);
      }
    } catch (err) {
      setError(err.message || 'Unable to load page list.');
    }
  }, [apiUrl, token]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchBooks();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [fetchBooks]);

  useEffect(() => {
    if (selectedBookId) {
      fetchBookPages(selectedBookId);
    }
  }, [selectedBookId, fetchBookPages]);

  const pickAndUploadPage = async () => {
    if (!selectedBookId) {
      Alert.alert('Select a book', 'Please choose a book from the list first.');
      return;
    }

    if (!ImagePicker || typeof ImagePicker.launchImageLibraryAsync !== 'function') {
      Alert.alert('Gallery unavailable', 'Install expo-image-picker in the app dependencies before uploading from the device gallery.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.35,
        base64: true
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        setIsSubmitting(false);
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        throw new Error('The selected image is missing a valid file URI.');
      }

      const fileName = asset.fileName || `book-page-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      if (!asset.base64 || typeof asset.base64 !== 'string' || asset.base64.length < 100) {
        throw new Error('The selected image does not contain valid base64 data for upload. Please choose another image.');
      }

      const imageData = `data:${mimeType};base64,${asset.base64}`;
      const payload = {
        imageData,
        pageNumber: pageNumber ? String(Number(pageNumber)) : undefined,
        title: `Page ${pageNumber || 'new'}`
      };

      const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/admin/books/${selectedBookId}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Page upload failed.');
      }

      setPageNumber('');
      await fetchBookPages(selectedBookId);
      await fetchBooks();
      Alert.alert('Success', 'Image uploaded to Cloudinary and saved to MongoDB.');
    } catch (err) {
      const message = err?.message || 'Unable to upload the selected image.';
      setError(message);
      Alert.alert('Upload failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Loading admin books...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.readerRoot} contentContainerStyle={styles.adminScrollContent}>
      <View style={styles.topHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerBookTitle}>Admin Panel</Text>
          <Text style={styles.headerBadgeText}>Real-time book data</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.adminCard}>
        <Text style={styles.adminSectionTitle}>Books</Text>
        {books.length === 0 ? (
          <Text style={styles.emptyText}>No books found in database.</Text>
        ) : (
          books.map((book) => (
            <TouchableOpacity
              key={book._id}
              onPress={() => setSelectedBookId(book._id)}
              activeOpacity={0.8}
              style={[styles.bookSelector, selectedBookId === book._id && styles.bookSelectorActive]}
            >
              <Text style={styles.bookSelectorText}>{book.title}</Text>
              <Text style={styles.bookSelectorMeta}>{book.pageCount ?? 0} pages</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.adminCard}>
        <Text style={styles.adminSectionTitle}>{bookTitle}</Text>

        <View style={styles.inlineInputRow}>
          <View style={styles.inlineInputWrap}>
            <Text style={styles.inputLabel}>Page #</Text>
            <TextInput
              style={styles.textInput}
              placeholder="5"
              keyboardType="numeric"
              value={pageNumber}
              onChangeText={setPageNumber}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={pickAndUploadPage}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryButtonText}>Upload page</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.adminCard}>
        <Text style={styles.adminSectionTitle}>Existing pages</Text>
        {pages.length === 0 ? (
          <Text style={styles.emptyText}>No pages uploaded for this book yet.</Text>
        ) : (
          pages.map((page) => (
            <View key={page._id} style={styles.pagePreviewCard}>
              <Image source={{ uri: page.imageUrl }} style={styles.pagePreviewImage} resizeMode="cover" />
              <View style={styles.pagePreviewFooter}>
                <Text style={styles.pagePreviewTitle}>Page {page.pageNumber}</Text>
                <TouchableOpacity
                  style={styles.deletePageButton}
                  onPress={async () => {
                    try {
                      const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/admin/books/${selectedBookId}/pages/${page._id}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Accept': 'application/json'
                        }
                      });
                      const data = await response.json();
                      if (!response.ok) {
                        throw new Error(data?.error || 'Unable to delete page.');
                      }
                      await fetchBookPages(selectedBookId);
                      await fetchBooks();
                    } catch (deleteError) {
                      Alert.alert('Delete failed', deleteError?.message || 'Unable to delete this page.');
                    }
                  }}
                >
                  <Text style={styles.deletePageText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
      const endpoint = `${apiUrl.replace(/\/+$/, '')}/api/pages`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
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
            onError={(e) => {
              console.log('[Reader] Image load error:', item.imageUrl, e.nativeEvent?.error || 'unknown');
            }}
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
      <View style={styles.topHeader}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerBookTitle} numberOfLines={1}>
            {bookTitle}
          </Text>
          <Text style={styles.headerBadgeText}>
            {pages.length > 0 ? `${pages.length} pages` : 'Loading pages'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5a4638" />
          <Text style={styles.loadingText}>Opening your book...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load pages</Text>
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
          keyExtractor={(item, index) => (item.pageNumber ? `page-${item.pageNumber}` : `page-${index}`)}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchBookPages(true)}
              tintColor="#5a4638"
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
    backgroundColor: '#f7f0e7',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 44
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f1e8',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 44
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: '#f6f1e8'
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 18 : 32,
    paddingBottom: 24,
    backgroundColor: '#f6f1e8'
  },
  loginCard: {
    backgroundColor: '#fffdf9',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#4b382d',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1e4d5',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    marginTop: 6
  },
  adminCard: {
    backgroundColor: '#fffdf9',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#4b382d',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1e4d5',
    marginBottom: 16
  },
  adminScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 18
  },
  adminSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d241f',
    marginBottom: 12
  },
  bookSelector: {
    backgroundColor: '#f8f3ee',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e7d5bf',
    marginBottom: 10
  },
  bookSelectorActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#38bdf8'
  },
  bookSelectorText: {
    color: '#2d241f',
    fontSize: 15,
    fontWeight: '700'
  },
  bookSelectorMeta: {
    color: '#7a685d',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18
  },
  inlineInputWrap: {
    flex: 1
  },
  selectBox: {
    height: 54,
    backgroundColor: '#f9f5f1',
    borderWidth: 1,
    borderColor: '#e9dcc9',
    borderRadius: 14,
    paddingHorizontal: 12,
    justifyContent: 'center'
  },
  selectTextInput: {
    color: '#2d241f',
    fontSize: 14,
    fontWeight: '600'
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    marginBottom: 12
  },
  pagePreviewCard: {
    marginBottom: 14,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e7d5bf',
    backgroundColor: '#fff'
  },
  pagePreviewImage: {
    width: '100%',
    height: 180
  },
  pagePreviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  pagePreviewTitle: {
    color: '#2d241f',
    fontWeight: '700',
    fontSize: 13
  },
  deletePageButton: {
    backgroundColor: '#f3e4d2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e7d5bf'
  },
  deletePageText: {
    color: '#7a3d2c',
    fontWeight: '700',
    fontSize: 11
  },
  logoBadge: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: '#f3e4d2',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6d2b1'
  },
  logoIcon: {
    fontSize: 34
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#8d6d52',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2d241f',
    textAlign: 'center',
    marginBottom: 8
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6b584d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 18
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#473a32',
    marginBottom: 8
  },
  textInput: {
    height: 54,
    backgroundColor: '#f9f5f1',
    borderWidth: 1,
    borderColor: '#e9dcc9',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2d241f'
  },
  primaryButton: {
    height: 54,
    backgroundColor: '#2d241f',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#2d241f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3
  },
  buttonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  toggleConfigButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  toggleConfigText: {
    fontSize: 12,
    color: '#7a685d',
    fontWeight: '600'
  },
  configBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1e3d4'
  },
  configLabel: {
    fontSize: 12,
    color: '#685a4f',
    marginBottom: 8,
    fontWeight: '600'
  },
  configInput: {
    height: 44,
    backgroundColor: '#f5efe8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eadbc4',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#2d241f'
  },

  readerRoot: {
    flex: 1,
    backgroundColor: '#f5efe6'
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 10 : 42,
    paddingBottom: 12,
    backgroundColor: '#fdfaf4',
    borderBottomWidth: 1,
    borderBottomColor: '#e8dcc6'
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: 12
  },
  headerBookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b241e',
    marginBottom: 2
  },
  headerBadgeText: {
    color: '#7b685f',
    fontSize: 11,
    fontWeight: '600'
  },
  logoutButton: {
    backgroundColor: '#f2e7db',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0cbb4'
  },
  logoutButtonText: {
    color: '#402f24',
    fontSize: 12,
    fontWeight: '700'
  },
  flatListContent: {
    paddingVertical: 12,
    paddingBottom: 30
  },
  pageCard: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center'
  },
  pageMetaBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f4ed',
    borderTopWidth: 1,
    borderTopColor: '#efe0cd'
  },
  pageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e5b43',
    letterSpacing: 0.8
  },
  pageSectionTitle: {
    fontSize: 11,
    color: '#7b695d',
    maxWidth: '62%',
    textAlign: 'right'
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#fdfaf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0e1cf'
  },
  pageImage: {
    width: '100%',
    aspectRatio: 0.72,
    backgroundColor: '#ffffff'
  },
  pageFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f9f4ed',
    borderTopWidth: 1,
    borderTopColor: '#efe0cd'
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e7d5b9',
    marginHorizontal: 16
  },
  footerText: {
    fontSize: 11,
    color: '#6d5f56',
    fontWeight: '600'
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
    color: '#6b584d'
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d241f',
    marginBottom: 6
  },
  errorDescription: {
    fontSize: 14,
    color: '#6d5f56',
    textAlign: 'center',
    marginBottom: 16
  },
  retryButton: {
    backgroundColor: '#a86c4a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#7b695d',
    fontSize: 14
  }
});
