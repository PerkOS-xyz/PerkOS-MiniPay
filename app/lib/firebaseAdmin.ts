import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-side Firebase Admin (used by the auth routes to mint custom tokens + store nonces).
// Same service account as the PerkOS mini-app / PerkOS-API — copy FIREBASE_* from PerkOS/.env.

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    );
  }

  // .env stores newlines as literal `\n`; convert them back for the PEM parser.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return cachedApp;
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
