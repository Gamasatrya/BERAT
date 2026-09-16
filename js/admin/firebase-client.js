/**
 * Firebase Client — Admin Panel Helper (Firestore Direct CRUD)
 * 
 * Functions to:
 *  1. Initialize Firebase (auth, db, storage)
 *  2. CRUD articles via Firestore Web SDK directly
 *  3. Upload images to Firebase Storage
 */

let _fbInitialized  = false;
let _fbAuth         = null;
let _fbDb           = null;
let _fbStorage      = null;
let _fbInitError    = null;

async function fbInit() {
  if (_fbInitialized) return !_fbInitError;

  try {
    const { app, auth, db, storage } = await initFirebase();
    _fbAuth    = auth;
    _fbDb      = db;
    _fbStorage = storage;
    _fbInitialized = true;
    _fbInitError   = null;
    return true;
  } catch (err) {
    _fbInitError   = err;
    _fbInitialized = true;
    console.warn('[Firebase Client] Initialization failed:', err.message);
    return false;
  }
}

// ─── Storage Upload ───────────────────────────────────────────────────────────

async function fbUploadArticleImage(file, articleId = 'temp', onProgress = null) {
  const ok = await fbInit();
  if (!ok) throw new Error('Firebase Storage belum dikonfigurasi.');

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format file tidak diizinkan. Gunakan JPG, JPEG, PNG, atau WEBP.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran file terlalu besar. Maksimal 5MB.');
  }

  const { ref, uploadBytesResumable, getDownloadURL } = await import(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js'
  );

  const timestamp   = Date.now();
  const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/articles/${articleId}/${timestamp}-${safeName}`;
  const storageRef  = ref(_fbStorage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (typeof onProgress === 'function') onProgress(percent);
      },
      (err) => {
        console.error('[Firebase Storage] Upload error:', err);
        reject(new Error('Upload gambar gagal: ' + err.message));
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (urlErr) {
          reject(new Error('Gagal mendapatkan URL gambar: ' + urlErr.message));
        }
      }
    );
  });
}

// ─── Articles Direct Firestore CRUD ─────────────────────────────────────────────

async function fbGetAllArticles() {
  await fbInit();
  const snapshot = await _fbDb.collection('articles').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function fbCreateArticle(dummyToken, articleData) {
  await fbInit();
  const now = new Date().toISOString();
  const docData = {
    ...articleData,
    createdAt: now,
    updatedAt: now
  };
  const docRef = await _fbDb.collection('articles').add(docData);
  return { id: docRef.id, ...docData };
}

async function fbUpdateArticle(dummyToken, articleId, articleData) {
  await fbInit();
  const now = new Date().toISOString();
  const docData = {
    ...articleData,
    updatedAt: now
  };
  await _fbDb.collection('articles').doc(articleId).update(docData);
  return { id: articleId, ...docData };
}

async function fbDeleteArticle(dummyToken, articleId) {
  await fbInit();
  await _fbDb.collection('articles').doc(articleId).delete();
  return { success: true, id: articleId };
}

// Expose functions to window
window.fbInit               = fbInit;
window.fbUploadArticleImage = fbUploadArticleImage;
window.fbGetAllArticles     = fbGetAllArticles;
window.fbCreateArticle      = fbCreateArticle;
window.fbUpdateArticle      = fbUpdateArticle;
window.fbDeleteArticle      = fbDeleteArticle;
