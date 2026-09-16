import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export async function loginOwnerWithFirebase(
  email: string,
  pass: string
): Promise<{ email: string; idToken: string; user: User }> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;
  const idToken = await user.getIdToken();
  return { email: user.email || email, idToken, user };
}

export async function logoutOwnerFromFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout error:', err);
  }
}

export function subscribeToFirebaseAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export default app;
