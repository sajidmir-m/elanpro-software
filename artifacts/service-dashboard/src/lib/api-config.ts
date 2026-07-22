/**
 * Resolves API URLs for web (same-origin /api), Vercel, and desktop builds.
 *
 * - Web + Vercel proxy: leave VITE_API_URL unset — requests use relative /api/*
 * - Desktop or split API host: set VITE_API_URL=https://your-api.example.com
 */
import { isDesktopApp } from "./runtime";

const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";

export function getApiBaseUrl(): string | null {
  if (!rawBaseUrl) return null;
  // Web builds deployed on Vercel already expose the API on the same origin
  // under /api, so forcing a separate host here creates unnecessary CORS
  // failures when old env vars still point at another deployment URL.
  if (!isDesktopApp && typeof window !== "undefined" && window.location.hostname.endsWith(".vercel.app")) {
    return null;
  }
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
