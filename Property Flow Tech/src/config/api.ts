const rawBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL || // legacy fallback
  "http://localhost:4000";

export const API_BASE_URL = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}
