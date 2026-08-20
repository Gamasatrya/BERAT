/**
 * Firebase Client SDK Configuration
 * 
 * Konfigurasi diambil dari server endpoint /api/firebase-config
 * agar API keys tidak ter-hardcode di source code frontend.
 * 
 * File ini digunakan oleh:
 *  - js/admin/firebase-client.js  (admin panel)
 *  - js/firebase-articles.js      (halaman publik)
 */

// Firebase config akan diisi oleh initFirebase() yang dipanggil
// setelah config berhasil diambil dari server.
window._firebaseApp = null;
window._firebaseAuth = null;
window._firebaseDb = null;
window._firebaseStorage = null;

/**
 * Ambil konfigurasi Firebase dari server dan inisialisasi SDK.
 * @returns {Promise<{app, auth, db, storage}>}
 */
async function initFirebase() {
  // Jika sudah diinisialisasi, kembalikan instance yang ada
  if (window._firebaseApp) {
    return {
      app:     window._firebaseApp,
      auth:    window._firebaseAuth,
      db:      window._firebaseDb,
      storage: window._firebaseStorage
    };
  }

  try {
    // Ambil config dari server (server mengambil dari .env)
    const res = await fetch('/api/firebase-config');
    if (!res.ok) throw new Error('Gagal mengambil konfigurasi Firebase dari server.');
    const firebaseConfig = await res.json();

    // Import Firebase modules (ESM via CDN)
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth }       = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { getFirestore }  = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const { getStorage }    = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');

    const app     = initializeApp(firebaseConfig);
    const auth    = getAuth(app);
    const db      = getFirestore(app);
    const storage = getStorage(app);

    // Simpan ke window agar dapat diakses oleh file lain
    window._firebaseApp     = app;
    window._firebaseAuth    = auth;
    window._firebaseDb      = db;
    window._firebaseStorage = storage;

    return { app, auth, db, storage };
  } catch (err) {
    console.error('[Firebase] Inisialisasi gagal:', err);
    throw err;
  }
}

// Ekspos ke window
window.initFirebase = initFirebase;
