import { UserProfile } from "../types";
import { INITIAL_TRADES } from "../constants";

const DB_NAME = 'trademind_db';
const DB_VERSION = 1;
const STORE_NAME = 'users';

export interface DataService {
  loadUsers(): Promise<UserProfile[]>;
  saveUser(user: UserProfile): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  exportToFile(data: any, filename: string): Promise<void>;
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
            const defaultUser: UserProfile = {
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
            };
            // Seed the DB
            this.saveUser(defaultUser).then(() => resolve([defaultUser]));
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

  async saveUser(user: UserProfile): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(user); // Upsert: Updates if exists, Adds if new

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(userId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async exportToFile(data: any, filename: string): Promise<void> {
    const jsonStr = JSON.stringify(data, null, 2);
    
    // Try Modern File System Access API
    if ('showSaveFilePicker' in window) {
      try {
        // @ts-ignore - TS might not know about showSaveFilePicker depending on config
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('File System Access API failed, falling back to download.', err);
      }
    }

    // Fallback to Blob Download
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const dataService = new IndexedDBService();
