import { ConceptGenerationService } from '../concept-generation';
import { prisma } from '@/lib/db/prisma';
import { redis } from '@/lib/redis/client';
import { PrismaClient } from '@prisma/client';

type MockPrismaTransaction = {
  conceptExplanation: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: MockPrismaTransaction) => Promise<any>) => callback({
      conceptExplanation: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    }))
  }
}));

jest.mock('@/lib/redis/client', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => Promise.resolve('Generated explanation')
        }
      })
    })
  }))
}));

describe('ConceptGenerationService', () => {
  let service: ConceptGenerationService;
  const mockRequest = {
    conceptId: 'test-concept',
    layer: 1,
    conceptTitle: 'Test Concept',
    isLeafNode: false,
    sourceContent: 'Test content',
    sessionId: 'test-session'
  };

  beforeEach(() => {
    service = new ConceptGenerationService();
    jest.clearAllMocks();
  });

  describe('generateContent', () => {
    it('should return cached content if available', async () => {
      (redis.get as jest.Mock).mockResolvedValue('Cached content');

      const result = await service.generateContent(mockRequest);

      expect(result).toEqual({
        content: 'Cached content',
        fromCache: true
      });
      expect(redis.get).toHaveBeenCalledWith('concept:test-concept:1');
    });

    it('should return database content if cache miss but db hit', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementationOnce((callback: (tx: MockPrismaTransaction) => Promise<any>) =>
        callback({
          conceptExplanation: {
            findUnique: jest.fn().mockResolvedValue({
              content: 'Database content'
            }),
            create: jest.fn(),
            update: jest.fn()
          }
        })
      );

      const result = await service.generateContent(mockRequest);

      expect(result).toEqual({
        content: 'Database content',
        fromCache: false
      });
      expect(redis.set).toHaveBeenCalledWith(
        'concept:test-concept:1',
        'Database content',
        'EX',
        3600
      );
    });

    it('should generate new content if no cache or db hit', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.$transaction as jest.Mock).mockImplementationOnce((callback: (tx: MockPrismaTransaction) => Promise<any>) =>
        callback({
          conceptExplanation: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
            update: jest.fn()
          }
        })
      );

      const result = await service.generateContent(mockRequest);

      expect(result).toEqual({
        content: 'Generated explanation',
        fromCache: false
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'concept:test-concept:1',
        'Generated explanation',
        'EX',
        3600
      );
    });
  });

  describe('regenerateContent', () => {
    it('should regenerate and update content', async () => {
      const result = await service.regenerateContent(mockRequest);

      expect(result).toEqual({
        content: 'Generated explanation',
        fromCache: false
      });
      expect(redis.del).toHaveBeenCalledWith('concept:test-concept:1');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'concept:test-concept:1',
        'Generated explanation',
        'EX',
        3600
      );
    });
  });
}); 