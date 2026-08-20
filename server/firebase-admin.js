/**
 * Firebase Admin SDK Initialization
 * Digunakan oleh server-side routes untuk berinteraksi dengan Firestore.
 * 
 * Memerlukan environment variable:
 *   FIREBASE_PROJECT_ID       — Project ID Firebase
 *   FIREBASE_SERVICE_ACCOUNT  — Service Account JSON (sebagai string, satu baris)
 */

const admin = require('firebase-admin');

let _adminApp = null;

/**
 * Menginisialisasi dan mengembalikan instance Firebase Admin App.
 * Singleton — hanya diinisialisasi sekali.
 * @returns {admin.app.App}
 */
function getAdminApp() {
  if (_adminApp) return _adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!projectId) {
    throw new Error(
      '[Firebase Admin] FIREBASE_PROJECT_ID tidak ditemukan di .env. ' +
      'Pastikan Anda sudah mengisi environment variable Firebase.'
    );
  }

  let credential;

  if (serviceAccountStr && serviceAccountStr.trim() !== '') {
    // Gunakan Service Account dari environment variable
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      credential = admin.credential.cert(serviceAccount);
    } catch (parseErr) {
      throw new Error(
        '[Firebase Admin] FIREBASE_SERVICE_ACCOUNT tidak bisa di-parse sebagai JSON. ' +
        'Pastikan format JSON valid (satu baris, escaped).'
      );
    }
  } else {
    // Fallback: Application Default Credentials (untuk deployment di GCP/Firebase hosting)
    credential = admin.credential.applicationDefault();
    console.warn(
      '[Firebase Admin] FIREBASE_SERVICE_ACCOUNT tidak ditemukan. ' +
      'Menggunakan Application Default Credentials. ' +
      'Ini normal untuk deployment di Google Cloud.'
    );
  }

  _adminApp = admin.initializeApp({
    credential,
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });

  console.log(`[Firebase Admin] Initialized. Project: ${projectId}`);
  return _adminApp;
}

/**
 * Mengembalikan instance Firestore
 * @returns {admin.firestore.Firestore}
 */
function getDb() {
  getAdminApp();
  return admin.firestore();
}

module.exports = { getAdminApp, getDb };
