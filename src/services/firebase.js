// JanSetu - Firebase initialization
// All Firebase services initialized here and exported for use across the app.
// NOTE: Gemini API calls NEVER happen from this file - only from Cloud Functions.

import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCpWvqVNEKBFB-FxUys4ZXgv5BXStxpHwQ",
  authDomain: "jansetu-dev.firebaseapp.com",
  projectId: "jansetu-dev",
  storageBucket: "jansetu-dev.firebasestorage.app",
  messagingSenderId: "633686150170",
  appId: "1:633686150170:web:4091017988bb93ff5955a3",
  measurementId: "G-Y76QF7MJND"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);

// Connect to Firebase Local Emulators in development/local mode
if (import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('JanSetu: Connecting to Firebase Local Emulators...');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export const analyticsReady = isSupported()
  .then((supported) => supported && firebaseConfig.measurementId && !import.meta.env.DEV ? getAnalytics(app) : null)
  .catch(() => null);

export default app;
