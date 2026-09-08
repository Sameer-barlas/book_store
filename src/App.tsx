import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Shield,
  Smartphone,
  Server,
  Code,
  Copy,
  Check,
  Lock,
  Unlock,
  LogOut,
  RefreshCw,
  Play,
  Terminal,
  ExternalLink,
  Folder,
  FileCode,
  ChevronRight,
  AlertCircle,
  Eye,
  CheckCircle2,
  XCircle,
  Database,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PROJECT_FILES, ProjectFile } from './data/projectFiles';

// Sample book pages corresponding to backend/api/index.js
const BOOK_PAGES_DATA = [
  {
    pageNumber: 1,
    title: "Cover & Title Page",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=85",
  },
  {
    pageNumber: 2,
    title: "Prologue: The Foundations",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=85",
  },
  {
    pageNumber: 3,
    title: "Chapter 1: The Architecture of Thought",
    imageUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=85",
  },
  {
    pageNumber: 4,
    title: "Chapter 2: Principles of Modern Craft",
    imageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=85",
  },
  {
    pageNumber: 5,
    title: "Chapter 3: The Digital Library",
    imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=85",
  },
  {
    pageNumber: 6,
    title: "Epilogue & Acknowledgments",
    imageUrl: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=1200&q=85",
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'code' | 'simulator' | 'api' | 'guide'>('code');
  const [selectedFile, setSelectedFile] = useState<ProjectFile>(PROJECT_FILES[0]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Mobile Simulator States
  const [simToken, setSimToken] = useState<string | null>(null);
  const [simEmail, setSimEmail] = useState<string>('subscriber@digitalpublishing.com');
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [screenCaptureBlocked, setScreenCaptureBlocked] = useState<boolean>(true);
  const [attemptedScreenshot, setAttemptedScreenshot] = useState<boolean>(false);

  // API Playground States
  const [apiEmail, setApiEmail] = useState<string>('subscriber@digitalpublishing.com');
  const [apiToken, setApiToken] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(false);

  const handleCopyCode = (content: string, path: string) => {
    navigator.clipboard.writeText(content);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Simulate API Login
  const executeSimLogin = (emailToTest: string) => {
    setSimLoading(true);
    setSimError(null);

    setTimeout(() => {
      const email = emailToTest.trim().toLowerCase();
      if (email === 'subscriber@digitalpublishing.com' || email === 'reader@example.com') {
        const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
          JSON.stringify({
            userId: 'usr_664e10b7f842',
            email: email,
            hasAccess: true,
            exp: Math.floor(Date.now() / 1000) + 7 * 86400
          })
        )}.simulated_sig_${Math.random().toString(36).substring(7)}`;
        setSimToken(mockJwt);
        setApiToken(mockJwt);
        setSimLoading(false);
      } else if (email === 'revoked@expired.com') {
        setSimError('Access denied: Subscriber entitlement expired or revoked.');
        setSimLoading(false);
      } else {
        setSimError('Access denied: Subscriber email not registered in system.');
        setSimLoading(false);
      }
    }, 450);
  };

  const handleSimLogout = () => {
    setSimToken(null);
    setSimError(null);
  };

  const triggerScreenshotTest = () => {
    setAttemptedScreenshot(true);
    setTimeout(() => setAttemptedScreenshot(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white tracking-tight">
                  Digital Book Publishing Platform
                </h1>
                <span className="text-[11px] font-medium uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  Production Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Express Serverless API (Vercel) + Expo React Native Reader (Android APK)
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              id="tab-code-btn"
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Source Files (9)</span>
            </button>

            <button
              id="tab-simulator-btn"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>App Simulator</span>
            </button>

            <button
              id="tab-api-btn"
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'api'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>API Playground</span>
            </button>

            <button
              id="tab-guide-btn"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Build & Deploy</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* TAB 1: SOURCE FILES EXPLORER */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* File Tree Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Project Structure
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">9 generated files</span>
                </div>

                {/* Backend Folder */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-amber-400">
                    <Server className="w-3.5 h-3.5" />
                    <span>backend/ (Express on Vercel)</span>
                  </div>
                  <div className="pl-4 space-y-0.5 border-l border-slate-800 ml-3">
                    {PROJECT_FILES.filter((f) => f.folder === 'backend').map((file) => (
                      <button
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
                          <span className="truncate font-mono">{file.path.replace('backend/', '')}</span>
                        </div>
                        {selectedFile.path === file.path && (
                          <ChevronRight className="w-3 h-3 text-sky-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frontend Folder */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-sky-400">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>frontend/ (Expo React Native APK)</span>
                  </div>
                  <div className="pl-4 space-y-0.5 border-l border-slate-800 ml-3">
                    {PROJECT_FILES.filter((f) => f.folder === 'frontend').map((file) => (
                      <button
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
                      {/* Reader Header */}
                      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
                        <div>
                          <h3 className="text-xs font-bold text-slate-100 truncate max-w-[170px]">
                            Principles of Architecture
                          </h3>
                          <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
                            DRM Protected • 6 Pages
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

                      {/* Vertical FlatList Pages */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-4">
                        {BOOK_PAGES_DATA.map((page) => (
                          <div
                            key={page.pageNumber}
                            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md"
                          >
                            <div className="px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between text-[11px]">
                              <span className="font-bold text-sky-400">PAGE {page.pageNumber}</span>
                              <span className="text-slate-400 truncate max-w-[170px]">
                                {page.title}
                              </span>
                            </div>
                            <div className="relative aspect-[3/4] bg-slate-950">
                              <img
                                src={page.imageUrl}
                                alt={page.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="px-3 py-1.5 bg-slate-800/60 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                              Page {page.pageNumber} of {BOOK_PAGES_DATA.length}
                            </div>
                          </div>
                        ))}

                        <div className="py-6 text-center text-xs text-slate-500">
                          End of authorized manuscript preview
                        </div>
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
                              bookTitle: "Principles of Digital Architecture",
                              totalPages: BOOK_PAGES_DATA.length,
                              pages: BOOK_PAGES_DATA
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
