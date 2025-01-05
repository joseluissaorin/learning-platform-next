const DB_NAME = 'learning-platform';
const DB_VERSION = 1;

export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor(private storeName: string) {
    this.dbReady = this.init();
  }

  private async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      // Only proceed in browser environment
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB is only available in browser environment'));
        return;
      }

      console.log(`[IndexedDB] Opening database ${DB_NAME} v${DB_VERSION}`);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('[IndexedDB] Database opened successfully');
        this.db = request.result;
        
        // Verify the store exists
        if (!this.db.objectStoreNames.contains(this.storeName)) {
          console.log(`[IndexedDB] Store ${this.storeName} not found, closing and reopening with new version`);
          this.db.close();
          const newRequest = indexedDB.open(DB_NAME, DB_VERSION + 1);
          
          newRequest.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(this.storeName)) {
              console.log(`[IndexedDB] Creating store ${this.storeName}`);
              db.createObjectStore(this.storeName, { keyPath: 'id' });
            }
          };

          newRequest.onsuccess = () => {
            console.log('[IndexedDB] Database reopened with new version');
            this.db = newRequest.result;
            resolve();
          };

          newRequest.onerror = () => {
            console.error('[IndexedDB] Failed to reopen database:', newRequest.error);
            reject(newRequest.error);
          };
        } else {
          resolve();
        }
      };

      request.onupgradeneeded = (event) => {
        console.log('[IndexedDB] Database upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.log(`[IndexedDB] Creating store ${this.storeName}`);
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.dbReady;
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ id: key, data: value, timestamp: Date.now() });

        request.onerror = () => {
          console.error('[IndexedDB] Error storing data:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          console.log('[IndexedDB] Data stored successfully');
          resolve();
        };
      } catch (error) {
        console.error('[IndexedDB] Transaction error:', error);
        reject(error);
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    await this.dbReady;
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onerror = () => {
          console.error('[IndexedDB] Error retrieving data:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          const result = request.result;
          console.log('[IndexedDB] Data retrieved successfully');
          resolve(result ? result.data : null);
        };
      } catch (error) {
        console.error('[IndexedDB] Transaction error:', error);
        reject(error);
      }
    });
  }

  async delete(key: string): Promise<void> {
    await this.dbReady;
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onerror = () => {
          console.error('[IndexedDB] Error deleting data:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          console.log('[IndexedDB] Data deleted successfully');
          resolve();
        };
      } catch (error) {
        console.error('[IndexedDB] Transaction error:', error);
        reject(error);
      }
    });
  }

  async clear(): Promise<void> {
    await this.dbReady;
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => {
          console.error('[IndexedDB] Error clearing store:', request.error);
          reject(request.error);
        };
        request.onsuccess = () => {
          console.log('[IndexedDB] Store cleared successfully');
          resolve();
        };
      } catch (error) {
        console.error('[IndexedDB] Transaction error:', error);
        reject(error);
      }
    });
  }

  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.dbReady;
    if (!this.db) throw new Error('Database not initialized');

    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.openCursor();

        request.onerror = () => {
          console.error('[IndexedDB] Error opening cursor:', request.error);
          reject(request.error);
        };
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            if (cursor.value.timestamp < cutoff) {
              console.log('[IndexedDB] Deleting old entry:', cursor.value.id);
              cursor.delete();
            }
            cursor.continue();
          } else {
            console.log('[IndexedDB] Cleanup completed');
            resolve();
          }
        };
      } catch (error) {
        console.error('[IndexedDB] Transaction error:', error);
        reject(error);
      }
    });
  }
} 