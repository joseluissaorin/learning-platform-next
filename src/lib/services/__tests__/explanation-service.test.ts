import { ExplanationService } from '../explanation-service';
import { explanationCacheService } from '@/lib/cache/explanation-cache';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock dependencies
jest.mock('@/lib/cache/explanation-cache');
jest.mock('@prisma/client');
jest.mock('@google/generative-ai');

describe('ExplanationService', () => {
  let service: ExplanationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = ExplanationService.getInstance();
  });

  describe('generateExplanation', () => {
    const mockParams = {
      conceptId: 'test-concept',
      layer: 1,
      context: 'test context',
      conceptPath: ['path1', 'path2'],
      forceRegenerate: false
    };

    it('should return cached explanation if available', async () => {
      const cachedContent = 'cached explanation';
      (explanationCacheService.getExplanation as jest.Mock).mockResolvedValue(cachedContent);

      const result = await service.generateExplanation(mockParams);
      expect(result).toBe(cachedContent);
      expect(explanationCacheService.getExplanation).toHaveBeenCalledWith(
        mockParams.conceptId,
        mockParams.layer
      );
    });

    it('should generate new explanation if cache miss', async () => {
      const generatedContent = 'generated explanation';
      (explanationCacheService.getExplanation as jest.Mock).mockResolvedValue(null);
      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => generatedContent }
          })
        })
      }));

      const result = await service.generateExplanation(mockParams);
      expect(result).toBe(generatedContent);
      expect(explanationCacheService.setExplanation).toHaveBeenCalledWith(
        mockParams.conceptId,
        mockParams.layer,
        generatedContent
      );
    });

    it('should force regenerate when specified', async () => {
      const generatedContent = 'regenerated content';
      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => generatedContent }
          })
        })
      }));

      const result = await service.generateExplanation({
        ...mockParams,
        forceRegenerate: true
      });
      expect(result).toBe(generatedContent);
      expect(explanationCacheService.getExplanation).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (explanationCacheService.getExplanation as jest.Mock).mockRejectedValue(new Error('Cache error'));
      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(new Error('Generation error'))
        })
      }));

      await expect(service.generateExplanation(mockParams)).rejects.toThrow('Generation error');
    });
  });

  describe('processContent', () => {
    it('should process content in batches', async () => {
      const content = 'test content\n## Section 1\nContent 1\n## Section 2\nContent 2';
      const layer = 1;
      const context = 'test context';

      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => 'processed content' }
          })
        })
      }));

      const result = await service['processContent'](content, layer, context);
      expect(result).toBe('processed content');
    });

    it('should handle markdown content correctly', async () => {
      const content = '# Header\n## Section\nContent\n- List item';
      const layer = 1;
      const context = 'test context';

      (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: { text: () => 'processed markdown' }
          })
        })
      }));

      const result = await service['processContent'](content, layer, context);
      expect(result).toBe('processed markdown');
    });
  });

  describe('clearCache', () => {
    it('should clear cache for specified concept and layer', async () => {
      await service.clearCache('test-concept', 1);
      expect(explanationCacheService.deleteExplanation).toHaveBeenCalledWith('test-concept', 1);
    });
  });
}); 