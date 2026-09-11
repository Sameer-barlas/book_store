import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from './lib/apiBase';

type Book = {
  _id: string;
  title: string;
  slug?: string;
  pageCount?: number;
};

type PageItem = {
  _id: string;
  pageNumber: number;
  imageUrl: string;
  title?: string;
};

export default function App() {
  const apiBaseUrl = getApiBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '');
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
      const response = await fetch(`${apiBaseUrl}/api/admin/books`, {
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
      const response = await fetch(`${apiBaseUrl}/api/admin/books/${bookId}/pages`, {
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
      void loadBooks();
    }
  }, [token, apiBaseUrl]);

  useEffect(() => {
    if (selectedBookId) {
      void loadPages(selectedBookId);
    }
  }, [selectedBookId, apiBaseUrl]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

        const response = await fetch(`${apiBaseUrl}/api/admin/books/${selectedBookId}/pages`, {
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
        if (selectedBookId) void loadPages(selectedBookId);
        if (token) void loadBooks();
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

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
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

            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
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
                  <img
                    src={page.imageUrl}
                    alt={page.title || `Page ${page.pageNumber}`}
                    className="h-52 w-full object-cover"
                  />
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
