import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  Firestore
} from 'firebase/firestore';

// Shared Cloud Firestore database ID for all users
const SHARED_DATABASE_ID = 'ai-studio-f2e1b78c-7adf-4b28-86ee-1e9983fb930d';

// In case firebase-applet-config.json exists
let firebaseConfig: Record<string, string> = {
  projectId: "gen-lang-client-0245469817",
  appId: "1:510352931677:web:cde480d8d51484ba39c6b4",
  apiKey: "AIzaSyCfScB_xPXWx8UBDsADKtVEWCqHPwOJCas",
  authDomain: "gen-lang-client-0245469817.firebaseapp.com",
  storageBucket: "gen-lang-client-0245469817.firebasestorage.app",
  messagingSenderId: "510352931677"
};

try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (window as any).__FIREBASE_CONFIG__;
  if (config) {
    firebaseConfig = config;
  }
} catch {
  // Ignore fallback
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const dbId = (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__?.firestoreDatabaseId) || SHARED_DATABASE_ID;

let firestoreInstance: Firestore;
try {
  let firestoreCache;
  try {
    firestoreCache = persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    });
  } catch {
    firestoreCache = memoryLocalCache();
  }
  firestoreInstance = initializeFirestore(app, {
    localCache: firestoreCache
  }, dbId);
} catch {
  firestoreInstance = getFirestore(app, dbId);
}

export const db = firestoreInstance;

export default app;
