import { RedisCache } from './cache';
import { type AnalysisRequest, type AnalysisResponse } from '@/types/analysis';
import crypto from 'crypto';

class AnalysisCacheService {
  private cache: RedisCache | null = null;
  private ttl = 3600; // 1 hour

  constructor() {
    // Only initialize if we're on the server side
    if (typeof window === 'undefined') {
      this.cache = new RedisCache();
    }
  }

  private generateKey(request: AnalysisRequest): string {
    const contentHash = crypto
      .createHash('md5')
      .update(request.content)
      .digest('base64');
    
    return `analysis:${contentHash}:${request.format}:${request.language}`;
  }

  async get(request: AnalysisRequest): Promise<AnalysisResponse | null> {
    // Return null if we're on the client side
    if (!this.cache) {
      console.warn('[AnalysisCache] Cache operations are only available server-side');
      return null;
    }

    try {
      const key = this.generateKey(request);
      return await this.cache.get<AnalysisResponse>(key);
    } catch (error) {
      console.error('[AnalysisCache] Error retrieving from cache:', error);
      return null;
    }
  }

  async set(request: AnalysisRequest, response: AnalysisResponse): Promise<void> {
    // Do nothing if we're on the client side
    if (!this.cache) {
      console.warn('[AnalysisCache] Cache operations are only available server-side');
      return;
    }

    try {
      const key = this.generateKey(request);
      await this.cache.set(key, response, { ttl: this.ttl });
    } catch (error) {
      console.error('[AnalysisCache] Error storing in cache:', error);
    }
  }

  async invalidate(request: AnalysisRequest): Promise<void> {
    // Do nothing if we're on the client side
    if (!this.cache) {
      console.warn('[AnalysisCache] Cache operations are only available server-side');
      return;
    }

    try {
      const key = this.generateKey(request);
      await this.cache.delete(key);
    } catch (error) {
      console.error('[AnalysisCache] Error invalidating cache:', error);
    }
  }
}

// Export a singleton instance
export const analysisCache = new AnalysisCacheService(); 