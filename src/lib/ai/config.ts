import { type AIProviderConfig } from "./assessment-ai-provider";

export interface AIConfig {
  claude: {
    apiKey: string;
    apiUrl: string;
    model: string;
    maxTokens: number;
    version: string;
  };
  gemini: {
    apiKey: string;
    apiUrl: string;
    model: string;
    maxTokens: number;
  };
}

const config: AIConfig = {
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || "",
    apiUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-opus-20240229",
    maxTokens: 4000,
    version: "2023-06-01",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    apiUrl: "https://generativelanguage.googleapis.com/v1/models",
    model: "gemini-pro",
    maxTokens: 2048,
  },
};

export function validateConfig() {
  if (!config.claude.apiKey) {
    throw new Error("Claude API key not configured. Set CLAUDE_API_KEY environment variable.");
  }
  if (!config.gemini.apiKey) {
    throw new Error("Gemini API key not configured. Set GEMINI_API_KEY environment variable.");
  }
}

export function getClaudeConfig() {
  validateConfig();
  return config.claude;
}

export function getGeminiConfig() {
  validateConfig();
  return config.gemini;
}

export function getGeminiEndpoint(model = config.gemini.model) {
  return `${config.gemini.apiUrl}/${model}:generateContent`;
}

export const AI_PROVIDER_CONFIG: AIProviderConfig = {
  type: process.env.NEXT_PUBLIC_AI_PROVIDER_TYPE as AIProviderConfig['type'] || 'openai',
  apiKey: process.env.NEXT_PUBLIC_AI_PROVIDER_API_KEY || '',
  baseUrl: process.env.NEXT_PUBLIC_AI_PROVIDER_BASE_URL,
  modelName: process.env.NEXT_PUBLIC_AI_PROVIDER_MODEL_NAME
};

// Model mappings for each provider
export const MODEL_MAPPINGS = {
  groq: {
    default: 'llama2-70b-4096',
    available: new Set(['llama2-70b-4096', 'mixtral-8x7b-32768'])
  },
  gemini: {
    default: 'gemini-pro',
    available: new Set(['gemini-pro'])
  },
  openai: {
    default: 'gpt-4-turbo-preview',
    available: new Set(['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'])
  },
  'custom-openai': {
    default: 'gpt-4',
    available: new Set(['gpt-4', 'gpt-3.5-turbo'])
  }
} as const;

// Validation function for provider configuration
export function validateProviderConfig(config: AIProviderConfig): void {
  if (!config.type) {
    throw new Error('AI provider type is required');
  }

  if (!config.apiKey) {
    throw new Error('AI provider API key is required');
  }

  if (config.type === 'custom-openai' && !config.baseUrl) {
    throw new Error('Base URL is required for custom OpenAI provider');
  }

  if (config.modelName && !MODEL_MAPPINGS[config.type].available.has(config.modelName)) {
    throw new Error(
      `Invalid model name for ${config.type} provider. Available models: ${
        Array.from(MODEL_MAPPINGS[config.type].available).join(', ')
      }`
    );
  }
}

// Get the default model for a provider
export function getDefaultModel(providerType: AIProviderConfig['type']): string {
  return MODEL_MAPPINGS[providerType].default;
} 