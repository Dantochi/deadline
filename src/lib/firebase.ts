// Firebase is only used for the optional accountability partner: accounts, usernames and a weekly summary.
// Everything else stays on the phone. Fill these in from Firebase → Project settings → Your apps → Web app
// (see docs/PARTNER.md). These values identify the project; they are not secrets.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, type Auth } from '@firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: '',
  authDomain: 'deadline-c21d9.firebaseapp.com',
  projectId: 'deadline-c21d9',
  storageBucket: 'deadline-c21d9.firebasestorage.app',
  messagingSenderId: '134720562004',
  appId: '',
};

/** Firebase App Distribution invite link (App Distribution → Invite links), so invited partners can install. */
export const INSTALL_LINK = '';

export const firebaseReady = !!firebaseConfig.apiKey && !!firebaseConfig.appId;

let services: { auth: Auth; db: Firestore } | null = null;
export function fb() {
  if (!firebaseReady) return null;
  if (!services) {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    services = {
      auth: initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }),
      db: initializeFirestore(app, { experimentalAutoDetectLongPolling: true }),
    };
  }
  return services;
}
