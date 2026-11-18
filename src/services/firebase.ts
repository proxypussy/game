import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  FriendshipRecord,
  MapId,
  PLAYER_CLASSES,
  PlayerBase,
  PlayerClassId,
  PlayerSave,
  PublicProfile,
} from '../game/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function onAuthChange(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

function generateFriendCode(uid: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  let code = 'ARC-';
  for (let i = 0; i < 6; i++) {
    code += chars[(hash + i * 7) % chars.length];
    hash = (hash >>> 3) ^ (hash << 5);
  }
  return code;
}

export interface LoadedAccount {
  profile: PublicProfile;
  save: PlayerSave;
  base: PlayerBase;
}

export async function loadAccountData(uid: string): Promise<LoadedAccount | null> {
  const profilePath = `publicProfiles/${uid}`;
  const savePath = `users/${uid}/private/main`;
  const basePath = `bases/${uid}`;

  let profileSnap;
  try {
    profileSnap = await getDoc(doc(db, 'publicProfiles', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, profilePath);
  }

  if (!profileSnap.exists()) {
    return null;
  }

  let saveSnap;
  try {
    saveSnap = await getDoc(doc(db, 'users', uid, 'private', 'main'));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, savePath);
  }

  let baseSnap;
  try {
    baseSnap = await getDoc(doc(db, 'bases', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, basePath);
  }

  const pData = profileSnap.data() as PublicProfile;
  const rawSave = saveSnap.exists()
    ? (saveSnap.data() as PlayerSave)
    : createInitialSave(uid, pData.playerClass);
  const sData: PlayerSave = {
    ...rawSave,
    lastDailyBonusDate: rawSave.lastDailyBonusDate ?? '',
    loginStreak: rawSave.loginStreak ?? 0,
    defenseWavesCleared: rawSave.defenseWavesCleared ?? 0,
  };
  const bData = baseSnap.exists()
    ? (baseSnap.data() as PlayerBase)
    : createInitialBase(uid, pData.displayName);

  return { profile: pData, save: sData, base: bData };
}

export function createInitialSave(uid: string, playerClass: PlayerClassId): PlayerSave {
  const cls = PLAYER_CLASSES[playerClass];
  return {
    uid,
    level: 1,
    exp: 0,
    gold: 250,
    arcaneDust: 10,
    currentMapId: 'emerald_meadow',
    posX: 1600,
    posY: 1200,
    equippedWeaponId: cls.starterWeaponId,
    equippedArmorId: 'ar_common_07',
    equippedHelmId: 'hl_common_09',
    equippedAccessoryId: 'ac_common_11',
    equippedSkills: [...cls.starterSkillIds],
    inventory: [
      { itemId: cls.starterWeaponId, qty: 1 },
      { itemId: 'ar_common_07', qty: 1 },
      { itemId: 'hl_common_09', qty: 1 },
      { itemId: 'ac_common_11', qty: 1 },
      { itemId: 'cs_common_13', qty: 5 },
      { itemId: 'cs_common_14', qty: 3 },
      { itemId: 'cs_common_15', qty: 3 },
    ],
    ownedSkills: cls.starterSkillIds.map((skillId) => ({ skillId, qty: 1 })),
    discoveredEnemies: [],
    enemiesDefeated: 0,
    bossesDefeated: 0,
    synthesesAttempted: 0,
    synthesesSucceeded: 0,
    lastDailyBonusDate: '',
    loginStreak: 0,
    defenseWavesCleared: 0,
  };
}

export function createInitialBase(uid: string, displayName: string): PlayerBase {
  return {
    ownerId: uid,
    ownerName: displayName.slice(0, 24),
    baseName: `${displayName.slice(0, 14)}の開拓拠点`,
    isPublic: true,
    structures: [
      { id: 'st_init_forge', type: 'forge', gx: 29, gy: 22, level: 1 },
      { id: 'st_init_fountain', type: 'healing_fountain', gx: 33, gy: 22, level: 1 },
      { id: 'st_init_lamp1', type: 'crystal_lamp', gx: 31, gy: 20, level: 1 },
    ],
    forgeLevel: 1,
    libraryLevel: 0,
  };
}

export async function createPlayerAccount(params: {
  uid: string;
  displayName: string;
  playerClass: PlayerClassId;
  hairColor: string;
  armorColor: string;
  bio: string;
}): Promise<LoadedAccount> {
  const cleanName = params.displayName.trim().slice(0, 24) || '開拓者';
  const cleanBio = params.bio.trim().slice(0, 120);
  const friendCode = generateFriendCode(params.uid);

  const profile: PublicProfile = {
    uid: params.uid,
    displayName: cleanName,
    friendCode,
    playerClass: params.playerClass,
    hairColor: params.hairColor,
    armorColor: params.armorColor,
    bio: cleanBio,
    level: 1,
    combatPower: 140,
    enemiesDefeated: 0,
    bestiaryCount: 0,
    rarityScore: 10,
    currentMapId: 'emerald_meadow',
    isPublic: true,
  };

  const save = createInitialSave(params.uid, params.playerClass);
  const base = createInitialBase(params.uid, cleanName);

  const batch = writeBatch(db);
  batch.set(doc(db, 'publicProfiles', params.uid), {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'users', params.uid, 'private', 'main'), {
    ...save,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'bases', params.uid), {
    ...base,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `account_create/${params.uid}`);
  }

  return { profile, save, base };
}

export async function savePlayerProgress(
  uid: string,
  save: PlayerSave,
  profileUpdates: Partial<Pick<PublicProfile, 'level' | 'combatPower' | 'enemiesDefeated' | 'bestiaryCount' | 'rarityScore' | 'currentMapId'>>,
): Promise<void> {
  const clampedSave = {
    uid,
    level: Math.max(1, Math.min(9999, Math.round(save.level))),
    exp: Math.max(0, Math.round(save.exp)),
    gold: Math.max(0, Math.round(save.gold)),
    arcaneDust: Math.max(0, Math.round(save.arcaneDust)),
    currentMapId: save.currentMapId,
    posX: Math.max(0, Math.min(9999, Math.round(save.posX))),
    posY: Math.max(0, Math.min(9999, Math.round(save.posY))),
    equippedWeaponId: save.equippedWeaponId.slice(0, 64),
    equippedArmorId: save.equippedArmorId.slice(0, 64),
    equippedHelmId: save.equippedHelmId.slice(0, 64),
    equippedAccessoryId: save.equippedAccessoryId.slice(0, 64),
    equippedSkills: save.equippedSkills.slice(0, 6),
    inventory: save.inventory.slice(0, 350),
    ownedSkills: save.ownedSkills.slice(0, 450),
    discoveredEnemies: save.discoveredEnemies.slice(0, 150),
    enemiesDefeated: Math.max(0, Math.round(save.enemiesDefeated)),
    bossesDefeated: Math.max(0, Math.round(save.bossesDefeated)),
    synthesesAttempted: Math.max(0, Math.round(save.synthesesAttempted)),
    synthesesSucceeded: Math.max(0, Math.round(save.synthesesSucceeded)),
    lastDailyBonusDate: (save.lastDailyBonusDate ?? '').slice(0, 16),
    loginStreak: Math.max(0, Math.min(100000, Math.round(save.loginStreak ?? 0))),
    defenseWavesCleared: Math.max(0, Math.min(1000000, Math.round(save.defenseWavesCleared ?? 0))),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid, 'private', 'main'), clampedSave);
  batch.update(doc(db, 'publicProfiles', uid), {
    ...profileUpdates,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/private/main`);
  }
}

export async function updateProfileAppearance(
  uid: string,
  updates: {
    displayName: string;
    playerClass: PlayerClassId;
    hairColor: string;
    armorColor: string;
    bio: string;
  },
): Promise<void> {
  const path = `publicProfiles/${uid}`;
  try {
    await updateDoc(doc(db, 'publicProfiles', uid), {
      displayName: updates.displayName.trim().slice(0, 24) || '開拓者',
      playerClass: updates.playerClass,
      hairColor: updates.hairColor,
      armorColor: updates.armorColor,
      bio: updates.bio.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function savePlayerBase(uid: string, base: PlayerBase): Promise<void> {
  const path = `bases/${uid}`;
  const forgeLevel = Math.min(20, base.structures.filter((s) => s.type === 'forge').length);
  const libraryLevel = Math.min(20, base.structures.filter((s) => s.type === 'library').length);

  try {
    await updateDoc(doc(db, 'bases', uid), {
      baseName: base.baseName.trim().slice(0, 36) || '開拓拠点',
      ownerName: base.ownerName.trim().slice(0, 24) || '開拓者',
      isPublic: Boolean(base.isPublic),
      structures: base.structures.slice(0, 150),
      forgeLevel,
      libraryLevel,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function loadBaseByOwnerId(ownerId: string): Promise<PlayerBase | null> {
  const path = `bases/${ownerId}`;
  try {
    const snap = await getDoc(doc(db, 'bases', ownerId));
    return snap.exists() ? (snap.data() as PlayerBase) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function searchProfileByFriendCode(code: string): Promise<PublicProfile | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  const path = 'publicProfiles';
  try {
    const q = query(
      collection(db, 'publicProfiles'),
      where('isPublic', '==', true),
      limit(200),
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const p = d.data() as PublicProfile;
      if (p.friendCode === clean) return p;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function sendFriendRequest(
  requester: PublicProfile,
  recipient: PublicProfile,
): Promise<void> {
  if (requester.uid === recipient.uid) return;
  const ids = [requester.uid, recipient.uid].sort();
  const docId = `${ids[0]}_${ids[1]}`.slice(0, 120);
  const path = `friendships/${docId}`;

  try {
    await setDoc(doc(db, 'friendships', docId), {
      requesterId: requester.uid,
      recipientId: recipient.uid,
      requesterName: requester.displayName.slice(0, 24),
      recipientName: recipient.displayName.slice(0, 24),
      participants: [requester.uid, recipient.uid],
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const path = `friendships/${friendshipId}`;
  try {
    await updateDoc(doc(db, 'friendships', friendshipId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeFriendship(friendshipId: string): Promise<void> {
  const path = `friendships/${friendshipId}`;
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeFriendships(
  uid: string,
  onUpdate: (list: FriendshipRecord[]) => void,
) {
  const path = 'friendships';
  const q = query(collection(db, 'friendships'), where('participants', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows: FriendshipRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FriendshipRecord, 'id'>),
      }));
      onUpdate(rows);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function fetchPublicProfilesByIds(uids: string[]): Promise<Record<string, PublicProfile>> {
  const out: Record<string, PublicProfile> = {};
  for (const id of uids.slice(0, 30)) {
    try {
      const snap = await getDoc(doc(db, 'publicProfiles', id));
      if (snap.exists()) {
        out[id] = snap.data() as PublicProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `publicProfiles/${id}`);
    }
  }
  return out;
}

export type LeaderboardCategory = 'combatPower' | 'enemiesDefeated' | 'level' | 'bestiaryCount' | 'rarityScore';

export async function fetchLeaderboard(category: LeaderboardCategory): Promise<PublicProfile[]> {
  const path = 'publicProfiles';
  try {
    const q = query(
      collection(db, 'publicProfiles'),
      where('isPublic', '==', true),
      limit(120),
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as PublicProfile);
    list.sort((a, b) => Number(b[category] ?? 0) - Number(a[category] ?? 0));
    return list.slice(0, 30);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function mapDisplayName(mapId: MapId): string {
  switch (mapId) {
    case 'emerald_meadow':
      return 'エメラルド始原平原';
    case 'azure_whisperwood':
      return '蒼炎の古樹林';
    case 'crimson_caldera':
      return '紅蓮の溶岩渓谷';
    case 'frostpeak_tundra':
      return '凍てつく星霜雪原';
    case 'arcane_sanctum':
      return '虚無のアルカナ聖域';
    case 'infinity_abyss':
      return '終焉のインフィニティ深淵';
  }
}
