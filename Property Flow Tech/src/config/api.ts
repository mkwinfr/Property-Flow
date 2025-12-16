const DEFAULT_API_BASE = "https://api.propertysuite.net/api";

// Prefer configured env, but never ship a localhost API in production builds.
const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL || // legacy fallback
  "";

const rawBase =
  import.meta.env.PROD &&
  /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(envBase)
    ? DEFAULT_API_BASE
    : envBase || DEFAULT_API_BASE;

export const API_BASE_URL = rawBase.replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");

  if (API_BASE_URL.endsWith("/api") && cleanPath.startsWith("api/")) {
    return `${API_BASE_URL}/${cleanPath.slice(4)}`;
  }

  return `${API_BASE_URL}/${cleanPath}`;
}
