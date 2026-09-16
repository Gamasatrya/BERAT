/**
 * Firebase Client SDK Configuration & Backward Compatibility Wrapper
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
    const { 
      getAuth, 
      signInWithEmailAndPassword, 
      signOut, 
      onAuthStateChanged,
      EmailAuthProvider 
    } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
    const { 
      getFirestore, 
      collection, 
      doc, 
      getDocs, 
      addDoc, 
      updateDoc, 
      deleteDoc, 
      query, 
      where, 
      orderBy 
    } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js');

    const app     = initializeApp(firebaseConfig);
    const auth    = getAuth(app);
    const db      = getFirestore(app);
    const storage = getStorage(app);

    // Backward-compatibility wrappers for Firebase Auth methods
    auth.signInWithEmailAndPassword = (email, password) => signInWithEmailAndPassword(auth, email, password);
    auth.signOut = () => signOut(auth);
    auth.onAuthStateChanged = (callback) => onAuthStateChanged(auth, callback);
    auth.EmailAuthProvider = EmailAuthProvider;

    // Backward-compatibility wrappers for Firestore collection queries & CRUD
    db.collection = (collectionName) => {
      const createBuilder = (constraints = []) => {
        return {
          where: (field, op, val) => createBuilder([...constraints, where(field, op, val)]),
          orderBy: (field, dir = 'asc') => createBuilder([...constraints, orderBy(field, dir)]),
          get: async () => {
            const q = constraints.length > 0 
              ? query(collection(db, collectionName), ...constraints)
              : collection(db, collectionName);
            const snap = await getDocs(q);
            return {
              docs: snap.docs.map(docSnap => ({
                id: docSnap.id,
                data: () => docSnap.data()
              }))
            };
          },
          add: async (data) => {
            const ref = await addDoc(collection(db, collectionName), data);
            return { id: ref.id };
          },
          doc: (docId) => {
            const docRef = doc(db, collectionName, docId);
            return {
              update: (data) => updateDoc(docRef, data),
              delete: () => deleteDoc(docRef)
            };
          }
        };
      };
      return createBuilder();
    };

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
