import { collection, doc, getDoc, getDocFromCache, getDocs, getDocsFromCache, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseClient';
import { UserProfile, Trade, ArchivedSession, UserSettings } from '../types';
import { INITIAL_TRADES } from '../constants';

const USERS = 'users';
const TRADES = 'trades';
const ARCHIVES = 'archives';

const defaultSettings: UserSettings = {
  defaultTargetPercent: 40,
  defaultStopLossPercent: 20,
  maxTradesPerDay: 3,
  maxRiskPerTradePercent: 4,
  checklistConfig: []
};

// Remove any undefined fields before sending to Firestore
const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return;
    if (Array.isArray(v)) {
      cleaned[k] = v.map(item => typeof item === 'object' && item !== null ? stripUndefined(item as any) : item);
    } else if (v && typeof v === 'object' && !(v instanceof Date)) {
      cleaned[k] = stripUndefined(v as any);
    } else {
      cleaned[k] = v;
    }
  });
  return cleaned as T;
};

async function ensureAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function retryGet<T>(fn: () => Promise<T>, retries = 4, baseMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const isOffline = err?.code === 'failed-precondition' || err?.message?.includes('offline');
      if (!isOffline) throw err;
      await delay(baseMs * 2 ** i);
    }
  }
  throw lastErr;
}

async function loadTrades(uid: string): Promise<Trade[]> {
  const tradesRef = collection(doc(db, USERS, uid), TRADES);
  let snapshot;
  try {
    snapshot = await retryGet(() => getDocs(tradesRef));
  } catch {
    try {
      snapshot = await getDocsFromCache(tradesRef);
    } catch {
      return [];
    }
  }
  return snapshot.docs
    .map(d => d.data() as Trade)
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
}

async function loadArchives(uid: string): Promise<ArchivedSession[]> {
  const archivesRef = collection(doc(db, USERS, uid), ARCHIVES);
  let snapshot;
  try {
    snapshot = await retryGet(() => getDocs(archivesRef));
  } catch {
    try {
      snapshot = await getDocsFromCache(archivesRef);
    } catch {
      return [];
    }
  }
  return snapshot.docs
    .map(d => d.data() as ArchivedSession)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
}

async function upsertTrades(uid: string, trades: Trade[]) {
  const tradesRef = collection(doc(db, USERS, uid), TRADES);
  const batch = writeBatch(db);
  const incomingIds = new Set(trades.map(t => t.id));

  trades.forEach(t => {
    const ref = doc(tradesRef, t.id);
    batch.set(ref, { ...stripUndefined(t), updatedAt: serverTimestamp() });
  });

  // Deletion sync requires a read; if that read fails we still persist incoming trades.
  try {
    const existing = await getDocs(tradesRef);
    existing.docs.forEach(d => {
      if (!incomingIds.has(d.id)) batch.delete(d.ref);
    });
  } catch (err) {
    console.warn('Skipping stale-trade cleanup; persisting incoming trades only.', err);
  }

  await batch.commit();
}

async function upsertArchives(uid: string, archives: ArchivedSession[]) {
  const archivesRef = collection(doc(db, USERS, uid), ARCHIVES);
  const batch = writeBatch(db);
  const incomingIds = new Set(archives.map(a => a.id));

  archives.forEach(a => {
    const ref = doc(archivesRef, a.id);
    batch.set(ref, { ...stripUndefined(a), updatedAt: serverTimestamp() });
  });

  // Deletion sync requires a read; if that read fails we still persist incoming archives.
  try {
    const existing = await getDocs(archivesRef);
    existing.docs.forEach(d => {
      if (!incomingIds.has(d.id)) batch.delete(d.ref);
    });
  } catch (err) {
    console.warn('Skipping stale-archive cleanup; persisting incoming archives only.', err);
  }

  await batch.commit();
}

export const dataService = {
  async loadUsers(): Promise<UserProfile[]> {
    const user = await ensureAuth();
    const userRef = doc(db, USERS, user.uid);
    let snap;
    try {
      snap = await retryGet(() => getDoc(userRef));
    } catch (err) {
      // Still failing after retries: try local cache
      try {
        snap = await getDocFromCache(userRef);
      } catch {
        throw err;
      }
    }

    if (!snap.exists()) {
      const defaultUser: UserProfile = {
        id: user.uid,
        name: user.displayName || 'Demo Trader',
        trades: INITIAL_TRADES,
        initialCapital: 10000,
        startDate: new Date().toISOString(),
        archives: [],
        settings: defaultSettings,
        subscriptionTier: 'pro'
      };
      await this.saveUser(defaultUser);
      return [defaultUser];
    }

    const base = snap.data() as Omit<UserProfile, 'trades' | 'archives'>;
    const trades = await loadTrades(user.uid);
    const archives = await loadArchives(user.uid);
    return [{ ...base, trades, archives }];
  },

  async saveUser(profile: UserProfile): Promise<void> {
    const user = await ensureAuth();
    if (user.uid !== profile.id) throw new Error('Cannot save another user');

    const { trades, archives, ...rest } = profile;
    const userRef = doc(db, USERS, user.uid);

    const existingSnap = await getDoc(userRef);

    const userData: any = {
      ...stripUndefined(rest),
      userId: user.uid,
      updatedAt: serverTimestamp()
    };

    if (!existingSnap.exists()) {
      userData.createdAt = serverTimestamp();
    }

    await setDoc(userRef, userData, { merge: true });

    await upsertTrades(user.uid, trades || []);
    await upsertArchives(user.uid, archives || []);
  },

  async deleteUser(userId: string): Promise<void> {
    const user = await ensureAuth();
    if (user.uid !== userId) throw new Error('Cannot delete another user');

    // Explicitly delete subcollections since Firestore does not cascade deletes.
    const tradesColRef = collection(db, USERS, userId, TRADES);
    const archivesColRef = collection(db, USERS, userId, ARCHIVES);

    const [tradesSnap, archivesSnap] = await Promise.all([
      getDocs(tradesColRef),
      getDocs(archivesColRef)
    ]);

    const batch = writeBatch(db);
    tradesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    archivesSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();

    await deleteDoc(doc(db, USERS, userId));
  },

  async exportToFile(data: any, filename: string): Promise<void> {
    const jsonStr = JSON.stringify(data, null, 2);
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
};
