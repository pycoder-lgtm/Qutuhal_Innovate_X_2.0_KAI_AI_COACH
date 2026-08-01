import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  getDocFromServer,
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, DailyPlan } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper to prevent hanging operations when Firestore backend is unreachable or offline
function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore operation timed out after ${ms}ms`)), ms)
    )
  ]);
}

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function ensureAuthenticatedUser() {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const anonRes = await signInAnonymously(auth);
    return anonRes.user;
  } catch (err) {
    console.warn("Background auto auth notice:", err);
    return null;
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.log('Google Sign-In popup closed by user.');
      return null;
    }
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/operation-not-allowed' || 
      error?.code === 'auth/admin-restricted-operation' ||
      error?.message?.includes('operation-not-allowed') ||
      error?.message?.includes('admin-restricted-operation')
    ) {
      console.warn("Email/Password registration restricted in Firebase project settings. Using fallback authentication session...");
      try {
        const anonRes = await signInAnonymously(auth);
        return anonRes.user;
      } catch (anonErr) {
        // Deterministic session UID fallback
        const cleanId = btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
        return {
          uid: `user_${cleanId}`,
          email: email.trim(),
          isAnonymous: true
        } as any;
      }
    }
    if (
      error?.code === 'auth/email-already-in-use' ||
      error?.message?.includes('email-already-in-use')
    ) {
      console.log("Email already registered. Attempting login with provided credentials...");
      try {
        const loginRes = await signInWithEmailAndPassword(auth, email, pass);
        return loginRes.user;
      } catch (loginErr: any) {
        console.warn("Email already registered; auto-login notice:", loginErr?.message || loginErr?.code);
        throw error;
      }
    }
    console.error("Email Registration Error:", error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return res.user;
  } catch (error: any) {
    if (
      error?.code === 'auth/operation-not-allowed' || 
      error?.code === 'auth/admin-restricted-operation' ||
      error?.message?.includes('operation-not-allowed') ||
      error?.message?.includes('admin-restricted-operation')
    ) {
      console.warn("Email/Password login restricted in Firebase project settings. Using fallback authentication session...");
      try {
        const anonRes = await signInAnonymously(auth);
        return anonRes.user;
      } catch (anonErr) {
        const cleanId = btoa(email.toLowerCase().trim()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
        return {
          uid: `user_${cleanId}`,
          email: email.trim(),
          isAnonymous: true
        } as any;
      }
    }
    if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/invalid-credential' ||
      error?.code === 'auth/email-already-in-use' ||
      error?.code === 'auth/too-many-requests'
    ) {
      console.warn("Email Login notice:", error?.message || error?.code);
      throw error;
    }
    console.error("Email Login Error:", error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
}

// Save User Profile to Firestore (with localStorage sync)
export async function clearAllUserDataFromFirestore(userId: string) {
  try {
    try {
      localStorage.clear();
    } catch (e) {}

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const d of days) {
      try {
        await withTimeout(deleteDoc(doc(db, 'users', userId, 'plans', d)), 4000);
      } catch (e) {}
    }

    try {
      const chatSnap = await withTimeout(getDocs(collection(db, 'users', userId, 'chat')), 4000);
      for (const chatDoc of chatSnap.docs) {
        try {
          await withTimeout(deleteDoc(chatDoc.ref), 2000);
        } catch (e) {}
      }
    } catch (e) {}

    try {
      await withTimeout(deleteDoc(doc(db, 'users', userId)), 6000);
    } catch (e) {}
  } catch (err) {
    console.debug("Firestore profile delete error or offline fallback", err);
  }
}

export async function saveProfileToFirestore(userId: string, profile: UserProfile) {
  const docPath = `users/${userId}`;
  try {
    localStorage.setItem(`kaicoach_profile_${userId}`, JSON.stringify(profile));
    localStorage.setItem('kai_coach_profile', JSON.stringify(profile));
    await withTimeout(setDoc(doc(db, 'users', userId), {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true }), 6000);
  } catch (err) {
    console.debug("Firestore profile save using local cache fallback");
  }
}

// Get User Profile from Firestore (with localStorage fallback)
export async function getProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'users', userId)), 6000);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      localStorage.setItem(`kaicoach_profile_${userId}`, JSON.stringify(data));
      localStorage.setItem('kai_coach_profile', JSON.stringify(data));
      return data;
    } else {
      localStorage.removeItem(`kaicoach_profile_${userId}`);
      localStorage.removeItem('kai_coach_profile');
      return null;
    }
  } catch (err) {
    console.debug("Firestore profile fetch using local cache fallback", err);
    try {
      const cached = localStorage.getItem(`kaicoach_profile_${userId}`) || localStorage.getItem('kai_coach_profile');
      if (cached) {
        return JSON.parse(cached) as UserProfile;
      }
    } catch (localErr) {}
  }
  return null;
}

// Save Daily Plan to Firestore
export async function savePlanToFirestore(userId: string, dayName: string, plan: DailyPlan) {
  const docPath = `users/${userId}/plans/${dayName}`;
  try {
    localStorage.setItem(`kaicoach_plan_${userId}_${dayName}`, JSON.stringify(plan));
    await withTimeout(setDoc(doc(db, 'users', userId, 'plans', dayName), {
      ...plan,
      updatedAt: new Date().toISOString()
    }), 6000);
  } catch (err) {
    console.debug("Firestore plan save using local cache fallback");
  }
}

// Get Daily Plan from Firestore
export async function getPlanFromFirestore(userId: string, dayName: string): Promise<DailyPlan | null> {
  try {
    const snap = await withTimeout(getDoc(doc(db, 'users', userId, 'plans', dayName)), 6000);
    if (snap.exists()) {
      const data = snap.data() as DailyPlan;
      localStorage.setItem(`kaicoach_plan_${userId}_${dayName}`, JSON.stringify(data));
      return data;
    } else {
      localStorage.removeItem(`kaicoach_plan_${userId}_${dayName}`);
      return null;
    }
  } catch (err) {
    console.debug("Firestore plan fetch using local cache fallback", err);
    try {
      const cached = localStorage.getItem(`kaicoach_plan_${userId}_${dayName}`);
      if (cached) {
        return JSON.parse(cached) as DailyPlan;
      }
    } catch (localErr) {
      console.error("Local plan cache read failed:", localErr);
    }
  }
  return null;
}

// Save Chat Message to Firestore
export async function saveChatMessageToFirestore(userId: string, message: { sender: 'user' | 'coach'; text: string; timestamp: number; image?: string }) {
  const path = `users/${userId}/chat`;
  try {
    const msgId = `${message.timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const msgData = {
      id: msgId,
      userId,
      role: message.sender,
      content: message.text,
      timestamp: message.timestamp,
      ...(message.image ? { image: message.image } : {})
    };
    
    // Save to local cache array
    try {
      const cached = localStorage.getItem(`kaicoach_chat_${userId}`);
      const list = cached ? JSON.parse(cached) : [];
      list.push({
        id: msgId,
        sender: message.sender,
        text: message.text,
        timestamp: message.timestamp,
        image: message.image
      });
      localStorage.setItem(`kaicoach_chat_${userId}`, JSON.stringify(list));
    } catch (lErr) {}

    await withTimeout(setDoc(doc(db, 'users', userId, 'chat', msgId), msgData), 6000);
  } catch (err) {
    console.debug("Firestore chat save using local cache fallback");
  }
}

// Get Chat Messages from Firestore
export async function getChatHistoryFromFirestore(userId: string) {
  try {
    const q = query(collection(db, 'users', userId, 'chat'), orderBy('timestamp', 'asc'), limit(50));
    const snap = await withTimeout(getDocs(q), 6000);
    if (!snap.empty) {
      const msgs = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          sender: (data.role === 'user' ? 'user' : 'coach') as 'user' | 'coach',
          text: data.content || '',
          timestamp: data.timestamp || Date.now(),
          image: data.image
        };
      });
      localStorage.setItem(`kaicoach_chat_${userId}`, JSON.stringify(msgs));
      return msgs;
    } else {
      localStorage.removeItem(`kaicoach_chat_${userId}`);
      return [];
    }
  } catch (err) {
    console.debug("Firestore chat fetch using local cache fallback", err);
    try {
      const cached = localStorage.getItem(`kaicoach_chat_${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (localErr) {}
  }
  return [];
}
