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

async function ensureAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user;
}

async function loadTrades(uid: string): Promise<Trade[]> {
  const tradesRef = collection(doc(db, USERS, uid), TRADES);
  let snapshot;
  try {
    snapshot = await getDocs(tradesRef);
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
    snapshot = await getDocs(archivesRef);
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
  const existing = await getDocs(tradesRef);
  const batch = writeBatch(db);
  const incomingIds = new Set(trades.map(t => t.id));

  trades.forEach(t => {
    const ref = doc(tradesRef, t.id);
    batch.set(ref, { ...t, updatedAt: serverTimestamp() });
  });

  existing.docs.forEach(d => {
    if (!incomingIds.has(d.id)) batch.delete(d.ref);
  });

  await batch.commit();
}

async function upsertArchives(uid: string, archives: ArchivedSession[]) {
  const archivesRef = collection(doc(db, USERS, uid), ARCHIVES);
  const existing = await getDocs(archivesRef);
  const batch = writeBatch(db);
  const incomingIds = new Set(archives.map(a => a.id));

  archives.forEach(a => {
    const ref = doc(archivesRef, a.id);
    batch.set(ref, { ...a, updatedAt: serverTimestamp() });
  });

  existing.docs.forEach(d => {
    if (!incomingIds.has(d.id)) batch.delete(d.ref);
  });

  await batch.commit();
}

export const dataService = {
  async loadUsers(): Promise<UserProfile[]> {
    const user = await ensureAuth();
    const userRef = doc(db, USERS, user.uid);
    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (err) {
      // Offline or network failure: try cache
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

    await setDoc(userRef, {
      ...rest,
      userId: user.uid,
      updatedAt: serverTimestamp(),
      createdAt: rest.startDate || serverTimestamp()
    });

    await upsertTrades(user.uid, trades || []);
    await upsertArchives(user.uid, archives || []);
  },

  async deleteUser(userId: string): Promise<void> {
    const user = await ensureAuth();
    if (user.uid !== userId) throw new Error('Cannot delete another user');
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
