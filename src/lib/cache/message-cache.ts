import { openDB, IDBPDatabase } from 'idb';
import { type Message } from '@/types/learning';

interface MessageCache {
  explanationId: string;
  messages: Message[];
  lastUpdated: number;
}

interface MessageDBSchema {
  messages: {
    key: string;
    value: MessageCache;
    indexes: {};
  };
}

const DB_NAME = 'learning-platform-messages';
const STORE_NAME = 'messages';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

class MessageCacheService {
  private db: Promise<IDBPDatabase<MessageDBSchema>> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.db = this.initDB();
    }
  }

  private async initDB() {
    return openDB<MessageDBSchema>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  async getMessages(explanationId: string): Promise<Message[]> {
    if (!this.db) return [];

    try {
      const db = await this.db;
      const cache = await db.get(STORE_NAME, explanationId);

      if (!cache) {
        return [];
      }

      // Check if cache is expired
      if (Date.now() - cache.lastUpdated > CACHE_DURATION) {
        await this.deleteMessages(explanationId);
        return [];
      }

      return cache.messages;
    } catch (error) {
      console.error('Error getting messages from cache:', error);
      return [];
    }
  }

  async setMessages(explanationId: string, messages: Message[]) {
    if (!this.db) return;

    try {
      const db = await this.db;
      const cache: MessageCache = {
        explanationId,
        messages,
        lastUpdated: Date.now(),
      };
      await db.put(STORE_NAME, cache, explanationId);
    } catch (error) {
      console.error('Error setting messages in cache:', error);
    }
  }

  async deleteMessages(explanationId: string) {
    if (!this.db) return;

    try {
      const db = await this.db;
      await db.delete(STORE_NAME, explanationId);
    } catch (error) {
      console.error('Error deleting messages from cache:', error);
    }
  }

  async clearExpiredMessages() {
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
      console.error('Error clearing expired messages:', error);
    }
  }
}

// Export singleton instance
export const messageCacheService = new MessageCacheService(); 