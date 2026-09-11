import React, { useEffect, useState } from 'react';

type Book = {
  _id: string;
  title: string;
  slug?: string;
  pageCount?: number;
  description?: string;
};

type PageItem = {
  _id: string;
  pageNumber: number;
  imageUrl: string;
  title?: string;
};

export default function App() {
  const [adminEmail, setAdminEmail] = useState('hafiz@gmail.com');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [bookTitle, setBookTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pageNumber, setPageNumber] = useState('');
  const [insertPosition, setInsertPosition] = useState('append');
  const [pageTitle, setPageTitle] = useState('');

  const loadBooks = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/books', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to load books.');
      setBooks(data.books || []);
      if ((data.books || []).length > 0 && !selectedBookId) {
        setSelectedBookId(data.books[0]._id);
      }
    } catch (err: any) {
      setError(err.message || 'Could not load books.');
    }
  };

  const loadPages = async (bookId: string) => {
    if (!token || !bookId) return;
    try {
      const response = await fetch(`/api/admin/books/${bookId}/pages`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Unable to load pages.');
      setPages(data.pages || []);
      setBookTitle(data.book?.title || 'Book');
    } catch (err: any) {
      setError(err.message || 'Could not load pages.');
    }
  };

  useEffect(() => {
    if (token) {
      loadBooks();
    }
  }, [token]);

  useEffect(() => {
    if (selectedBookId) {
      loadPages(selectedBookId);
    }
  }, [selectedBookId]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: adminEmail })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Admin login failed.');

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setBooks([]);
    setPages([]);
    setSelectedBookId('');
    setError('');
  };

  const handleUpload = async () => {
    if (!token || !selectedBookId || !uploadFile) {
      setError('Choose a book and upload an image first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result;

        const response = await fetch(`/api/admin/books/${selectedBookId}/pages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            imageData,
            pageNumber: pageNumber ? Number(pageNumber) : undefined,
            insertPosition,
            title: pageTitle || undefined
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Page upload failed.');

        setUploadFile(null);
        setPageNumber('');
        setPageTitle('');
        setInsertPosition('append');
        if (selectedBookId) loadPages(selectedBookId);
        if (token) loadBooks();
      };
      reader.readAsDataURL(uploadFile);
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Admin access</p>
            <h1 className="mt-3 text-3xl font-bold">Book Admin Panel</h1>
          </div>

          <label className="mb-2 block text-sm text-slate-300">Admin email</label>
          <input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none ring-0"
            placeholder="hafiz@gmail.com"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Login as admin'}
          </button>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-300">
            Default admin email: <span className="font-semibold text-sky-300">hafiz@gmail.com</span>
          </div>

          {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-400">Admin panel</p>
            <h1 className="text-xl font-bold">Digital Book Manager</h1>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Books</h2>
            <span className="rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-300">{books.length}</span>
          </div>

          <div className="space-y-3">
            {books.map((book) => (
              <button
                key={book._id}
                onClick={() => setSelectedBookId(book._id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedBookId === book._id
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-slate-700 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-white">{book.title}</p>
                  <span className="text-xs text-slate-400">{book.pageCount || 0} pages</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{book.slug || 'book-1'}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Selected book</p>
                <h2 className="text-2xl font-bold">{bookTitle || 'Book manager'}</h2>
              </div>
              <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {pages.length} pages
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Page number</label>
                <input
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Insert position</label>
                <select
                  value={insertPosition}
                  onChange={(e) => setInsertPosition(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                >
                  <option value="append">Append at end</option>
                  <option value="before">Insert before this page</option>
                  <option value="after">Insert after this page</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">Page title</label>
                <input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Page title"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-slate-300">Upload page image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full rounded-xl border border-dashed border-slate-700 bg-slate-950 p-3 text-sm text-slate-300"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-sm text-slate-400">{uploadFile ? `Selected: ${uploadFile.name}` : 'No image selected yet'}</div>
              <button
                onClick={handleUpload}
                disabled={loading || !uploadFile}
                className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {loading ? 'Uploading...' : 'Upload page'}
              </button>
            </div>

            {error && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-lg font-semibold">Pages in this book</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pages.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 p-6 text-sm text-slate-400 md:col-span-2 xl:col-span-3">
                  No pages uploaded yet for this book.
                </div>
              )}

              {pages.map((page) => (
                <div key={page._id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  <img src={page.imageUrl} alt={page.title || `Page ${page.pageNumber}`} className="h-52 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Page {page.pageNumber}</p>
                      <p className="text-sm font-medium text-white">{page.title || `Page ${page.pageNumber}`}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                          selectedFile.path === file.path
                            ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate font-mono">{file.path.replace('frontend/', '')}</span>
                        </div>
                        {selectedFile.path === file.path && (
                          <ChevronRight className="w-3 h-3 text-sky-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Architecture Specifications Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-3">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Key Security & Architecture
                </h3>
                <ul className="space-y-2 text-slate-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">anti-screenshot DRM:</strong> Calls{' '}
                      <code className="text-sky-300">ScreenCapture.preventScreenCaptureAsync()</code> on Android launch.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">Secure Store:</strong> JWT tokens are stored using{' '}
                      <code className="text-sky-300">expo-secure-store</code>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">EAS Build APK:</strong> Configured in{' '}
                      <code className="text-sky-300">eas.json</code> under preview profile.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">Serverless Caching:</strong> Reuses Mongoose connection across Vercel invocations.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Code Viewer */}
            <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              {/* File Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      selectedFile.folder === 'backend'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        : 'bg-sky-950 text-sky-300 border border-sky-800/60'
                    }`}
                  >
                    {selectedFile.folder}
                  </span>
                  <div className="font-mono text-sm font-semibold text-slate-200 truncate">
                    /{selectedFile.path}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="copy-current-file-btn"
                    onClick={() => handleCopyCode(selectedFile.content, selectedFile.path)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                  >
                    {copiedPath === selectedFile.path ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy File</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Description Strip */}
              <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Description:</span>
                <span>{selectedFile.description}</span>
              </div>

              {/* Code Preformatted Block with Line Numbers */}
              <div className="flex-1 overflow-x-auto p-4 bg-slate-950 font-mono text-xs leading-relaxed max-h-[600px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {selectedFile.content.split('\n').map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                        <td className="pr-4 select-none text-right text-slate-600 text-[11px] w-10 align-top">
                          {idx + 1}
                        </td>
                        <td className="text-slate-300 whitespace-pre font-mono">
                          {line || ' '}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE MOBILE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Simulator Controls & Explanations */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                  <h2 className="text-base font-semibold text-white">
                    Android React Native Simulator
                  </h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Experience the exact user flow rendered by{' '}
                  <code className="text-sky-300">frontend/App.js</code> on an Android device with{' '}
                  <strong className="text-slate-200">anti-screenshot DRM</strong> and{' '}
                  <strong className="text-slate-200">secure token storage</strong>.
                </p>

                {/* Anti-Screen Capture Indicator */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400">
                        DRM Screen Protection
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800/60">
                      FLAG_SECURE ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    <code className="text-sky-300">ScreenCapture.preventScreenCaptureAsync()</code> enforces native OS level capture blocking.
                  </p>
                  <button
                    id="test-screenshot-btn"
                    onClick={triggerScreenshotTest}
                    className="w-full mt-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate User Attempting Screenshot</span>
                  </button>
                </div>

                {/* Pre-seeded Test Accounts */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Quick-Test Subscriber Credentials:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        setSimEmail('subscriber@digitalpublishing.com');
                        executeSimLogin('subscriber@digitalpublishing.com');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-400">
                          subscriber@digitalpublishing.com
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Subscriber (hasAccess: true)</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400" />
                    </button>

                    <button
                      onClick={() => {
                        setSimEmail('revoked@expired.com');
                        executeSimLogin('revoked@expired.com');
                      }}
                      className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-left border border-slate-700/60 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-rose-400">
                          revoked@expired.com
                        </div>
                        <div className="text-[11px] text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Revoked Subscriber (hasAccess: false)</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
                    </button>
                  </div>
                </div>

                {/* SecureStore State Inspector */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>expo-secure-store State:</span>
                    <span className={simToken ? 'text-emerald-400' : 'text-slate-500'}>
                      {simToken ? 'TOKEN_STORED' : 'EMPTY'}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded text-slate-400 truncate">
                    {simToken ? simToken : 'null (unauthenticated)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Device Frame */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="relative w-full max-w-[390px] h-[720px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col">
                {/* Speaker & Camera Notch */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-800 mr-2" />
                  <div className="w-8 h-1 bg-slate-800 rounded-full" />
                </div>

                {/* Screen Content Container */}
                <div className="w-full h-full bg-slate-950 rounded-[34px] overflow-hidden flex flex-col relative border border-slate-800">
                  {/* Status Bar */}
                  <div className="h-9 px-6 pt-2 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 font-mono select-none z-20">
                    <span>09:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">5G</span>
                      <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5 flex items-center">
                        <div className="w-2.5 h-full bg-slate-300" />
                      </div>
                    </div>
                  </div>

                  {/* Screenshot Blocker Simulation Overlay */}
                  {attemptedScreenshot && (
                    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-full bg-rose-950 border border-rose-800/80 flex items-center justify-center text-rose-400 mb-3">
                        <Shield className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        Screenshot Blocked
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                        Can't take screenshot due to security policy ({' '}
                        <code className="text-sky-400">FLAG_SECURE</code> enforced by{' '}
                        <code className="text-sky-400">expo-screen-capture</code>).
                      </p>
                    </div>
                  )}

                  {/* Screen Switcher */}
                  {simToken ? (
                    /* READER SCREEN */
                    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
                        <div>
                          <h3 className="text-xs font-bold text-slate-100 truncate max-w-[170px]">
                            {livePages.length > 0 ? 'Book 1' : 'Loading book...'}
                          </h3>
                          <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                            {livePages.length > 0 ? `${livePages.length} Pages` : 'Fetching pages'}
                          </span>
                        </div>
                        <button
                          onClick={handleSimLogout}
                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium transition-colors"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Logout</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {livePages.length > 0 ? (
                          livePages.map((page) => (
                            <div
                              key={page.pageNumber}
                              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md"
                            >
                              <div className="px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between text-[11px]">
                                <span className="font-bold text-sky-400">PAGE {page.pageNumber}</span>
                                <span className="text-slate-400 truncate max-w-[170px]">
                                  {page.title || `Page ${page.pageNumber}`}
                                </span>
                              </div>
                              <div className="relative aspect-[3/4] bg-slate-950">
                                <img
                                  src={page.imageUrl}
                                  alt={page.title || `Page ${page.pageNumber}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              <div className="px-3 py-1.5 bg-slate-800/60 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                                Page {page.pageNumber} of {livePages.length}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            Waiting for live backend page data...
                          </div>
                        )}

                        {livePages.length > 0 && (
                          <div className="py-6 text-center text-xs text-slate-500">
                            End of authorized manuscript preview
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* LOGIN SCREEN */
                    <div className="flex-1 flex flex-col justify-center p-6 bg-slate-950 overflow-y-auto">
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-950 border border-sky-800/80 mx-auto flex items-center justify-center text-sky-400">
                          <BookOpen className="w-6 h-6" />
                        </div>

                        <div className="text-center space-y-1">
                          <h3 className="text-base font-bold text-white">Digital Book Reader</h3>
                          <p className="text-[11px] text-slate-400">
                            Subscriber manuscript & publishing portal
                          </p>
                        </div>

                        {/* Security notice banner */}
                        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-[10px] text-emerald-300 font-medium leading-tight">
                            Screen recording and screenshot protection enabled.
                          </span>
                        </div>

                        {/* Email Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-300 block">
                            Subscriber Email
                          </label>
                          <input
                            type="email"
                            value={simEmail}
                            onChange={(e) => setSimEmail(e.target.value)}
                            placeholder="reader@example.com"
                            className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        {simError && (
                          <div className="p-2 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{simError}</span>
                          </div>
                        )}

                        {/* Start Reading Button */}
                        <button
                          id="sim-start-reading-btn"
                          onClick={() => executeSimLogin(simEmail)}
                          disabled={simLoading}
                          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow"
                        >
                          {simLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Reading</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Android Home Bar */}
                  <div className="h-5 bg-slate-950 flex items-center justify-center">
                    <div className="w-24 h-1 bg-slate-700 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BACKEND API PLAYGROUND */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-white">
                  Vercel Serverless Express API Tester
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Directly simulate requests to the Express endpoints implemented in{' '}
                <code className="text-sky-300">backend/api/index.js</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Endpoint 1: POST /api/login */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        POST
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        /api/login
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Public</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Request Body:</label>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                      <div>{'{'}</div>
                      <div className="pl-4">
                        "email": "
                        <input
                          type="text"
                          value={apiEmail}
                          onChange={(e) => setApiEmail(e.target.value)}
                          className="bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-sky-300 focus:outline-none focus:border-sky-500 w-52"
                        />
                        "
                      </div>
                      <div>{'}'}</div>
                    </div>
                  </div>

                  <button
                    id="test-api-login-btn"
                    onClick={() => {
                      setApiLoading(true);
                      setTimeout(() => {
                        const email = apiEmail.trim().toLowerCase();
                        if (email.includes('subscriber') || email.includes('reader')) {
                          const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
                            JSON.stringify({
                              userId: 'usr_664e10b7f842',
                              email: email,
                              hasAccess: true,
                              exp: Math.floor(Date.now() / 1000) + 7 * 86400
                            })
                          )}.signature_hash_preview`;
                          setApiToken(token);
                          setApiResponse({
                            status: 200,
                            data: {
                              token,
                              user: {
                                email: email,
                                hasAccess: true
                              }
                            }
                          });
                        } else {
                          setApiResponse({
                            status: 401,
                            data: {
                              error: 'Access denied. Account not authorized or reader access revoked.'
                            }
                          });
                        }
                        setApiLoading(false);
                      }, 400);
                    }}
                    disabled={apiLoading}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Send POST /api/login Request</span>
                  </button>
                </div>

                {/* Endpoint 2: GET /api/pages */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                        GET
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-200">
                        /api/pages
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Protected
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400">Authorization Header:</label>
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 truncate">
                      <span className="text-slate-500">Bearer </span>
                      <span className="text-sky-400">
                        {apiToken ? apiToken : '<JWT token from /api/login>'}
                      </span>
                    </div>
                  </div>

                  <button
                    id="test-api-pages-btn"
                    onClick={() => {
                      setApiLoading(true);
                      setTimeout(() => {
                        if (!apiToken) {
                          setApiResponse({
                            status: 401,
                            data: {
                              error: 'Authorization header missing or malformed. Format: Bearer <token>'
                            }
                          });
                        } else {
                          setApiResponse({
                            status: 200,
                            data: {
                              bookTitle: 'Book 1',
                              totalPages: 0,
                              pages: []
                            }
                          });
                        }
                        setApiLoading(false);
                      }, 400);
                    }}
                    disabled={apiLoading}
                    className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Send GET /api/pages Request</span>
                  </button>
                </div>
              </div>

              {/* API Response Viewer */}
              {apiResponse && (
                <div className="mt-6 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Server Response Payload:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        apiResponse.status === 200
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      HTTP {apiResponse.status}
                    </span>
                  </div>
                  <pre className="text-slate-300 overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(apiResponse.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTION BUILD & DEPLOY GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">
                  Deployment & Standalone Android APK Build Guide
                </h2>
                <p className="text-xs text-slate-400">
                  Step-by-step instructions to deploy the backend to Vercel and generate the Android preview APK with Expo Application Services (EAS).
                </p>
              </div>

              {/* Step 1: MongoDB Setup */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <Database className="w-4 h-4" />
                  <span>Step 1: MongoDB Atlas Setup & User Seeding</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Create a free cluster on MongoDB Atlas and insert subscriber documents into the{' '}
                  <code className="text-sky-300">users</code> collection:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto">
                  {`// MongoDB Atlas Document Insertion
db.users.insertOne({
  email: "subscriber@digitalpublishing.com",
  hasAccess: true,
  createdAt: new Date(),
  updatedAt: new Date()
});`}
                </div>
              </div>

              {/* Step 2: Backend Vercel Deploy */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-sky-400">
                  <Server className="w-4 h-4" />
                  <span>Step 2: Deploy Express API to Vercel</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Navigate into the <code className="text-sky-300">backend</code> directory and deploy using the Vercel CLI:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-300 space-y-1">
                  <div className="text-slate-500"># 1. Change to backend directory</div>
                  <div className="text-sky-300">cd backend</div>
                  <div className="text-slate-500"># 2. Install dependencies</div>
                  <div className="text-sky-300">npm install</div>
                  <div className="text-slate-500"># 3. Deploy to Vercel (sets up env variables MONGODB_URI & JWT_SECRET)</div>
                  <div className="text-sky-300">vercel --prod</div>
                </div>
              </div>

              {/* Step 3: Expo EAS APK Build */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <span>Step 3: Generate Android APK via EAS</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The <code className="text-sky-300">frontend/eas.json</code> file is pre-configured with{' '}
                  <code className="text-emerald-300">"buildType": "apk"</code> under the preview profile for direct installation on Android devices:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-slate-300 space-y-1">
                  <div className="text-slate-500"># 1. Change to frontend directory</div>
                  <div className="text-sky-300">cd frontend</div>
                  <div className="text-slate-500"># 2. Install dependencies</div>
                  <div className="text-sky-300">npm install</div>
                  <div className="text-slate-500"># 3. Log in to your Expo account</div>
                  <div className="text-sky-300">npx eas-cli login</div>
                  <div className="text-slate-500"># 4. Trigger standalone Android APK compilation in cloud</div>
                  <div className="text-sky-300">npx eas-cli build -p android --profile preview</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
