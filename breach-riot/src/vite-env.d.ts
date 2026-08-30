/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCORES_URL?: string;
  readonly VITE_PROGRESS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
