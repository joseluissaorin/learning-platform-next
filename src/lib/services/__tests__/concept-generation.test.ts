import { ConceptGenerationService } from '../concept-generation';
import { prisma } from '@/lib/db/prisma';
import { getRedisClient } from '@/lib/redis/client';
import { type GenerateRequest } from '../types';

// Mock the dependencies
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    conceptExplanation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/redis/client', () => ({
  getRedisClient: jest.fn(),
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Generated content',
        },
      }),
    }),
  })),
}));

describe('ConceptGenerationService', () => {
  let service: ConceptGenerationService;
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRequest: GenerateRequest = {
    conceptId: 'test-id',
    layer: 1,
    conceptTitle: 'test-title',
    documentContent: 'test-content',
    sessionId: 'test-session',
    parentTitles: [],
    isLeafNode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    service = new ConceptGenerationService();
  });

  describe('generateContent', () => {
    it('should return cached content if available', async () => {
      const mockCachedContent = 'Cached content';
      mockRedisClient.get.mockResolvedValue(mockCachedContent);

      const result = await service.generateContent(mockRequest);
      expect(result).toBe(mockCachedContent);
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should return database content if cache miss but db hit', async () => {
      const mockDbContent = { content: 'DB content' };
      mockRedisClient.get.mockResolvedValue(null);
      (prisma.conceptExplanation.findUnique as jest.Mock).mockResolvedValue(mockDbContent);

      const result = await service.generateContent(mockRequest);
      expect(result).toBe(mockDbContent.content);
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should generate new content if no cache or db hit', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      (prisma.conceptExplanation.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.generateContent(mockRequest);
      expect(result).toBe('Generated content');
      expect(prisma.conceptExplanation.create).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('regenerateContent', () => {
    it('should regenerate and update content', async () => {
      const result = await service.regenerateContent(mockRequest);
      expect(result).toBe('Generated content');
      expect(prisma.conceptExplanation.update).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });
}); 