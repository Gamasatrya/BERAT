/**
 * Firebase Client SDK Configuration
 */

window._firebaseApp = null;
window._firebaseAuth = null;
window._firebaseDb = null;
window._firebaseStorage = null;

async function initFirebase() {
  if (window._firebaseApp) {
    return {
      app:     window._firebaseApp,
      auth:    window._firebaseAuth,
      db:      window._firebaseDb,
      storage: window._firebaseStorage
    };
  }

  try {
    // Hardcoded Firebase Web SDK configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCXW4U9Zlr_MWhcZrCNz62DSu9Ix2pjI6c",
      authDomain: "buwas-ikigai-nusantara.firebaseapp.com",
      projectId: "buwas-ikigai-nusantara",
      storageBucket: "buwas-ikigai-nusantara.firebasestorage.app",
      messagingSenderId: "617114927641",
      appId: "1:617114927641:web:7e224c2d5e0677dbb96088"
    };

    // Import Firebase modules (ESM via CDN)
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const { getAuth }       = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { getFirestore }  = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const { getStorage }    = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');

    const app     = initializeApp(firebaseConfig);
    const auth    = getAuth(app);
    const db      = getFirestore(app);
    const storage = getStorage(app);

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

window.initFirebase = initFirebase;
