/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string; // legacy fallback
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
