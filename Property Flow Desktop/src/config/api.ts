const DEFAULT_API_BASE = "https://api.propertysuite.net/api";

const envBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "";

// Is the configured API pointing to localhost?
const isLocalApi =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envBase);

// Is the frontend itself running on localhost?
const isFrontendLocal =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

// Final decision:
// - Local frontend → allow localhost API
// - Remote frontend → force production API
const rawBase =
  isLocalApi && !isFrontendLocal
    ? DEFAULT_API_BASE
    : envBase || DEFAULT_API_BASE;

const API_BASE_URL = rawBase.replace(/\/+$/, "");

export { API_BASE_URL };

/**
 * Build a fully-qualified API URL from a relative path.
 * Handles cases where the base already includes `/api`.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");

  if (API_BASE_URL.endsWith("/api") && cleanPath.startsWith("api/")) {
    return `${API_BASE_URL}/${cleanPath.slice(4)}`;
  }

  return `${API_BASE_URL}/${cleanPath}`;
}
