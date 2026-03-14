import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebaseClient";
import { UserProfile, Trade, ArchivedSession, UserSettings } from "../types";
import { INITIAL_TRADES } from "../constants";

const USERS = "users";
const SETTINGS = "settings";
const TRADES = "trades";
const ARCHIVES = "archives";

const defaultSettings: UserSettings = {
  defaultTargetPercent: 40,
  defaultStopLossPercent: 20,
  maxTradesPerDay: 3,
  maxRiskPerTradePercent: 4,
  checklistConfig: []
};

async function ensureAuth() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user;
}

async function loadProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, USERS, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const base = snap.data() as Omit<UserProfile, "trades" | "archives">;
  const trades = await loadTrades(uid);
  const archives = await loadArchives(uid);
  return { ...base, trades, archives };
}

async function loadTrades(uid: string): Promise<Trade[]> {
  const tradesRef = collection(doc(db, USERS, uid), TRADES);
  const snapshot = await getDocs(tradesRef);
  return snapshot.docs.map(d => d.data() as Trade).sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
}

async function loadArchives(uid: string): Promise<ArchivedSession[]> {
  const archivesRef = collection(doc(db, USERS, uid), ARCHIVES);
  const snapshot = await getDocs(archivesRef);
  return snapshot.docs.map(d => d.data() as ArchivedSession).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
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
    if (!incomingIds.has(d.id)) {
      batch.delete(d.ref);
    }
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
    if (!incomingIds.has(d.id)) {
      batch.delete(d.ref);
    }
  });

  await batch.commit();
}

export const dataService = {
  async loadUsers(): Promise<UserProfile[]> {
    const user = await ensureAuth();
    const profile = await loadProfile(user.uid);
    if (profile) return [profile];

    const defaultUser: UserProfile = {
      id: user.uid,
      name: user.displayName || "Demo Trader",
      trades: INITIAL_TRADES,
      initialCapital: 10000,
      startDate: new Date().toISOString(),
      archives: [],
      settings: defaultSettings,
      subscriptionTier: "pro"
    };

    await this.saveUser(defaultUser);
    return [defaultUser];
  },

  async saveUser(userProfile: UserProfile): Promise<void> {
    const user = await ensureAuth();
    if (user.uid !== userProfile.id) {
      throw new Error("Cannot save another user's profile");
    }

    const { trades, archives, ...rest } = userProfile;
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
    if (user.uid !== userId) throw new Error("Cannot delete another user");
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
