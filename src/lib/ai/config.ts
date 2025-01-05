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