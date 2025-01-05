import { getRedisClient } from './client';

export class RedisCache {
  private client = getRedisClient();

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('[RedisCache] Error retrieving value:', error);
      return null;
    }
  }

  async set(key: string, value: unknown, options?: { ttl?: number }): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (options?.ttl) {
        await this.client.setex(key, options.ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error('[RedisCache] Error setting value:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[RedisCache] Error deleting value:', error);
    }
  }
} 