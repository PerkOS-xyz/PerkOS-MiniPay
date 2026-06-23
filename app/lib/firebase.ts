import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Client-side Firebase. PerkOS-MiniPay reads/writes the SAME Firestore project as the PerkOS
// mini-app, so these NEXT_PUBLIC_FIREBASE_* values are the same ones in PerkOS/.env.

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

function handles() {
  if (cached) return cached;
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}

export function firebaseAuth(): Auth {
  return handles().auth;
}

export function firebaseDb(): Firestore {
  return handles().db;
}
