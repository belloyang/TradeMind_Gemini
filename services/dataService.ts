import { UserProfile } from "../types";
import { INITIAL_TRADES } from "../constants";

const DB_NAME = 'trademind_db';
const DB_VERSION = 1;
const STORE_NAME = 'users';

export interface DataService {
  loadUsers(): Promise<UserProfile[]>;
  saveUsers(users: UserProfile[]): Promise<void>;
}

class IndexedDBService implements DataService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  async loadUsers(): Promise<UserProfile[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const users = request.result as UserProfile[];
          if (!users || users.length === 0) {
            // Return default initial data if DB is empty
            resolve([
              {
                id: 'demo-user',
                name: 'Demo Trader',
                trades: INITIAL_TRADES,
                initialCapital: 10000,
                startDate: new Date('2024-05-01').toISOString(),
                archives: [],
                settings: {
                  defaultTargetPercent: 40,
                  defaultStopLossPercent: 20,
                  maxTradesPerDay: 3,
                  maxRiskPerTradePercent: 4
                }
              }
            ]);
          } else {
            resolve(users);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("IndexedDB Load Error:", error);
      return [];
    }
  }

  async saveUsers(users: UserProfile[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing and rewrite (simplest strategy for this scale)
      // For larger apps, we would update individual records
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        let completed = 0;
        if (users.length === 0) {
            resolve();
            return;
        }

        users.forEach(user => {
          const addRequest = store.add(user);
          addRequest.onsuccess = () => {
            completed++;
            if (completed === users.length) resolve();
          };
          addRequest.onerror = () => reject(addRequest.error);
        });
      };

      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }
}

export const dataService = new IndexedDBService();