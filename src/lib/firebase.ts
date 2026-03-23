import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

declare const __FIREBASE_API_KEY__: string;

const firebaseConfig = {
  apiKey: __FIREBASE_API_KEY__,
  authDomain: 'phyla-digital-platform.firebaseapp.com',
  projectId: 'phyla-digital-platform',
  storageBucket: 'phyla-digital-platform.firebasestorage.app',
  messagingSenderId: '1046318779931',
  appId: '1:1046318779931:web:e54946678a10f83d70f2be',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  db = getFirestore(app);
}

export { db };
export const auth = getAuth(app);
