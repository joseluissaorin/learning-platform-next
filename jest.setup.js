import '@testing-library/jest-dom';

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_API_KEY = 'test-public-api-key';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test-password';
process.env.UPSTASH_REDIS_REST_URL = 'https://test-url.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('{{layer}}\n{{parentContext}}\n{{conceptTitle}}\n{{isLeafNode}}\n{{sourceContent}}'),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('/mocked/path/to/prompt.md'),
})); 