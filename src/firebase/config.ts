import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

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

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, 'ai-studio-f2e1b78c-7adf-4b28-86ee-1e9983fb930d');

export default app;
