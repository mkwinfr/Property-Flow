const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const API_BASE_URL = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

export { API_BASE_URL };

/**
 * Build a fully-qualified API URL from a relative path.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}
