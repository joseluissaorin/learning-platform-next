export interface Env {
  // API Keys
  GOOGLE_API_KEY: string;
  API_KEY: string;
  NEXT_PUBLIC_API_KEY: string;

  // Rate Limiting
  RATE_LIMIT_REQUESTS: number;
  RATE_LIMIT_WINDOW: string;

  // Cache Configuration
  CACHE_TTL: number;

  // Analysis Configuration
  MAX_DOCUMENT_SIZE: number;
  MAX_DOCUMENTS_PER_REQUEST: number;
  ANALYSIS_TIMEOUT: number;
}

export type EnvKey = keyof Env;

export interface EnvSchema {
  key: EnvKey;
  required: boolean;
  type: "string" | "number";
  description: string;
  default?: string | number;
} 