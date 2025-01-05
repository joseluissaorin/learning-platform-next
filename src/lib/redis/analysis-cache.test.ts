import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { analysisCache } from './analysis-cache';
import { RedisCache } from './cache';
import { type AnalysisRequest, type AnalysisResponse } from '@/types/analysis';

// Mock RedisCache
jest.mock('./cache');

describe('AnalysisCacheService', () => {
  const mockRequest: AnalysisRequest = {
    content: 'Test content',
    format: 'markdown',
    language: 'en'
  };

  const mockResponse: AnalysisResponse = {
    success: true,
    analysis: {
      fundamentalConcepts: ['concept1'],
      intermediateConcepts: ['concept2'],
      advancedConcepts: ['concept3'],
      hierarchicalStructure: 'test structure',
      justification: 'test justification'
    },
    index: [],
    relationships: []
  };

  let mockRedisCache: jest.Mocked<RedisCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create mock functions for each method
    mockRedisCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn()
    } as unknown as jest.Mocked<RedisCache>;
    
    // Replace the cache instance
    (analysisCache as any).cache = mockRedisCache;
  });

  describe('get', () => {
    it('should return cached response when available', async () => {
      // Setup
      mockRedisCache.get.mockResolvedValue(mockResponse);

      // Execute
      const result = await analysisCache.get(mockRequest);

      // Verify
      expect(result).toEqual(mockResponse);
      expect(mockRedisCache.get).toHaveBeenCalledTimes(1);
    });

    it('should return null when cache miss occurs', async () => {
      // Setup
      mockRedisCache.get.mockResolvedValue(null);

      // Execute
      const result = await analysisCache.get(mockRequest);

      // Verify
      expect(result).toBeNull();
      expect(mockRedisCache.get).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      // Setup
      mockRedisCache.get.mockRejectedValue(new Error('Redis error'));

      // Execute
      const result = await analysisCache.get(mockRequest);

      // Verify
      expect(result).toBeNull();
      expect(mockRedisCache.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('set', () => {
    it('should cache response successfully', async () => {
      // Setup
      mockRedisCache.set.mockResolvedValue(undefined);

      // Execute
      await analysisCache.set(mockRequest, mockResponse);

      // Verify
      expect(mockRedisCache.set).toHaveBeenCalledTimes(1);
      expect(mockRedisCache.set).toHaveBeenCalledWith(
        expect.any(String),
        mockResponse,
        { ttl: 3600 }
      );
    });

    it('should handle errors gracefully', async () => {
      // Setup
      mockRedisCache.set.mockRejectedValue(new Error('Redis error'));

      // Execute & Verify
      await expect(analysisCache.set(mockRequest, mockResponse)).resolves.not.toThrow();
      expect(mockRedisCache.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidate', () => {
    it('should invalidate cache successfully', async () => {
      // Setup
      mockRedisCache.delete.mockResolvedValue(undefined);

      // Execute
      await analysisCache.invalidate(mockRequest);

      // Verify
      expect(mockRedisCache.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      // Setup
      mockRedisCache.delete.mockRejectedValue(new Error('Redis error'));

      // Execute & Verify
      await expect(analysisCache.invalidate(mockRequest)).resolves.not.toThrow();
      expect(mockRedisCache.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('key generation', () => {
    it('should generate consistent cache keys', async () => {
      // Setup
      mockRedisCache.get.mockResolvedValue(null);
      const request1 = { ...mockRequest };
      const request2 = { ...mockRequest };

      // Execute
      await analysisCache.get(request1);
      await analysisCache.get(request2);

      // Verify
      const firstCall = mockRedisCache.get.mock.calls[0][0];
      const secondCall = mockRedisCache.get.mock.calls[1][0];
      expect(firstCall).toBe(secondCall);
    });

    it('should generate different keys for different content', async () => {
      // Setup
      mockRedisCache.get.mockResolvedValue(null);
      const request1 = { ...mockRequest };
      const request2 = { ...mockRequest, content: 'Different content' };

      // Execute
      await analysisCache.get(request1);
      await analysisCache.get(request2);

      // Verify
      const firstCall = mockRedisCache.get.mock.calls[0][0];
      const secondCall = mockRedisCache.get.mock.calls[1][0];
      expect(firstCall).not.toBe(secondCall);
    });
  });
}); 