// lib/firebase-admin.ts
let admin: any;

try {
  admin = require("firebase-admin");
} catch (error) {
  console.error(
    "Firebase Admin not found. Please install: npm install firebase-admin"
  );
  throw error;
}

if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

// ✅ Unified export
export function getFirebaseAdmin() {
  return {
    adminAuth: admin.auth(),
    adminDb: admin.firestore(),
  };
}
