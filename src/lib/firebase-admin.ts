import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readServiceAccount() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (rawServiceAccount) {
    try {
      const parsed = JSON.parse(rawServiceAccount) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
      };
    } catch {
      // Ignore malformed JSON and fall back to explicit env keys below.
    }
  }

  return {
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail:
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey:
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  };
}

const adminCredentials = readServiceAccount();
const projectId = adminCredentials.projectId;
const clientEmail = adminCredentials.clientEmail;
const privateKey = adminCredentials.privateKey?.replace(/\\n/g, "\n");

console.info("Firebase Admin environment status", {
  projectIdLoaded: Boolean(projectId),
  projectIdLength: projectId?.length ?? 0,
  clientEmailLoaded: Boolean(clientEmail),
  clientEmailLength: clientEmail?.length ?? 0,
  privateKeyLoaded: Boolean(privateKey),
  privateKeyLength: privateKey?.length ?? 0,
});

export function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = getAdminApp();

export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;

export function ensureAdminConfigured() {
  if (!adminApp) {
    throw new Error("Firebase Admin credentials are not configured.");
  }

  return adminApp;
}