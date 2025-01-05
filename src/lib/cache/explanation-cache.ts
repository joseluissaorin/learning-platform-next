import { openDB, IDBPDatabase } from 'idb';

interface ExplanationCache {
  explanationId: string;
  content: string;
  layer: number;
  lastUpdated: number;
}

interface ExplanationDBSchema {
  explanations: {
    key: string;
    value: ExplanationCache;
    indexes: {};
  };
}

const DB_NAME = 'learning-platform-explanations';
const STORE_NAME = 'explanations';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

class ExplanationCacheService {
  private db: Promise<IDBPDatabase<ExplanationDBSchema>> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.db = this.initDB();
    }
  }

  private async initDB() {
    return openDB<ExplanationDBSchema>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  private getCacheKey(explanationId: string, layer: number): string {
    return `${explanationId}-${layer}`;
  }

  async getExplanation(explanationId: string, layer: number): Promise<string | null> {
    if (!this.db) return null;

    try {
      const db = await this.db;
      const cacheKey = this.getCacheKey(explanationId, layer);
      const cache = await db.get(STORE_NAME, cacheKey);

      if (!cache) {
        return null;
      }

      // Check if cache is expired
      if (Date.now() - cache.lastUpdated > CACHE_DURATION) {
        await this.deleteExplanation(explanationId, layer);
        return null;
      }

      return cache.content;
    } catch (error) {
      console.error('Error getting explanation from cache:', error);
      return null;
    }
  }

  async setExplanation(explanationId: string, layer: number, content: string) {
    if (!this.db) return;

    try {
      const db = await this.db;
      const cacheKey = this.getCacheKey(explanationId, layer);
      const cache: ExplanationCache = {
        explanationId,
        content,
        layer,
        lastUpdated: Date.now(),
      };
      await db.put(STORE_NAME, cache, cacheKey);
    } catch (error) {
      console.error('Error setting explanation in cache:', error);
    }
  }

  async deleteExplanation(explanationId: string, layer: number) {
    if (!this.db) return;

    try {
      const db = await this.db;
      const cacheKey = this.getCacheKey(explanationId, layer);
      await db.delete(STORE_NAME, cacheKey);
    } catch (error) {
      console.error('Error deleting explanation from cache:', error);
    }
  }

  async clearExpiredExplanations() {
    if (!this.db) return;

    try {
      const db = await this.db;
      const keys = await db.getAllKeys(STORE_NAME);
      const now = Date.now();

      for (const key of keys) {
        const cache = await db.get(STORE_NAME, key);
        if (cache && now - cache.lastUpdated > CACHE_DURATION) {
          await db.delete(STORE_NAME, key);
        }
      }
    } catch (error) {
      console.error('Error clearing expired explanations:', error);
    }
  }
}

// Export singleton instance
export const explanationCacheService = new ExplanationCacheService(); 