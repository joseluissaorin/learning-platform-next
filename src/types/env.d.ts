declare namespace NodeJS {
  interface ProcessEnv {
    // AI Provider Configuration
    NEXT_PUBLIC_AI_PROVIDER_TYPE: 'groq' | 'gemini' | 'openai' | 'custom-openai';
    NEXT_PUBLIC_AI_PROVIDER_API_KEY: string;
    NEXT_PUBLIC_AI_PROVIDER_BASE_URL?: string;
    NEXT_PUBLIC_AI_PROVIDER_MODEL_NAME?: string;

    // Database Configuration
    DATABASE_URL: string;
    DATABASE_HOST: string;
    DATABASE_PORT: string;
    DATABASE_NAME: string;
    DATABASE_USER: string;
    DATABASE_PASSWORD: string;

    // Next Auth Configuration
    NEXTAUTH_URL: string;
    NEXTAUTH_SECRET: string;

    // OAuth Providers
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;

    // API Keys
    OPENAI_API_KEY: string;
    GROQ_API_KEY: string;
    GEMINI_API_KEY: string;

    // Other Configuration
    NODE_ENV: 'development' | 'production' | 'test';
  }
} 