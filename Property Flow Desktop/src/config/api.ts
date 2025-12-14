const rawBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL || // legacy fallback
  "http://localhost:4000/api";

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
