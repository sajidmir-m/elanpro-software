/**
 * Resolves API URLs for web (same-origin /api), Vercel, and desktop builds.
 *
 * - Web + Vercel proxy: leave VITE_API_URL unset — requests use relative /api/*
 * - Desktop or split API host: set VITE_API_URL=https://your-api.example.com
 */
const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";

export function getApiBaseUrl(): string | null {
  if (!rawBaseUrl) return null;
  return rawBaseUrl.replace(/\/+$/, "");
}

export function resolveApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl || !path.startsWith("/")) return path;
  return `${baseUrl}${path}`;
}

export function configureApiClient(setBaseUrl: (url: string | null) => void): void {
  setBaseUrl(getApiBaseUrl());
}
