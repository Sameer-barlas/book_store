export const DEFAULT_LOCAL_API_URL = 'http://localhost:5000';

export function normalizeApiUrl(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return DEFAULT_LOCAL_API_URL;

  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCAL_API_URL;

  return trimmed.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

export function getApiBaseUrl(
  value?: string | null,
  env: Record<string, string | undefined> = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
): string {
  const configured = normalizeApiUrl(value);
  const envUrl = env.VITE_API_URL || env.VITE_BACKEND_URL || '';

  return normalizeApiUrl(envUrl || configured || DEFAULT_LOCAL_API_URL);
}
