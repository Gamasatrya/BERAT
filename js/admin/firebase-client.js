/**
 * Firebase Client — Admin Panel Helper
 * 
 * Menyediakan fungsi-fungsi untuk:
 *  1. Inisialisasi Firebase (auth, db, storage)
 *  2. CRUD artikel via REST API (menggunakan JWT token existing)
 *  3. Upload gambar ke Firebase Storage (via Firebase JS SDK)
 * 
 * PENTING: Autentikasi admin TETAP menggunakan sistem JWT existing.
 * Firebase Storage diakses langsung via Client SDK dengan aturan Storage
 * yang memerlukan Firebase Authentication.
 * 
 * Strategi:
 *  - Login admin tetap via /api/auth/login (JWT)
 *  - CRUD artikel via /api/articles (JWT protected REST endpoints)  
 *  - Upload gambar ke Firebase Storage via Firebase Client SDK
 *    menggunakan Anonymous Auth atau Firebase Auth Email/Password
 */

// ─── Initialization ───────────────────────────────────────────────────────────

let _fbInitialized  = false;
let _fbAuth         = null;
let _fbDb           = null;
let _fbStorage      = null;
let _fbInitError    = null;

/**
 * Inisialisasi Firebase Client SDK.
 * Dipanggil sekali saat admin panel dimuat.
 * @returns {Promise<boolean>} true jika berhasil, false jika gagal/belum dikonfigurasi
 */
async function fbInit() {
  if (_fbInitialized) return !_fbInitError;

  try {
    const { app, auth, db, storage } = await initFirebase();
    _fbAuth    = auth;
    _fbDb      = db;
    _fbStorage = storage;
    _fbInitialized = true;
    _fbInitError   = null;
    console.log('[Firebase Client] Initialized successfully.');
    return true;
  } catch (err) {
    _fbInitError   = err;
    _fbInitialized = true; // Tandai sudah dicoba agar tidak retry terus
    console.warn('[Firebase Client] Tidak dapat diinisialisasi:', err.message);
    return false;
  }
}

// ─── Storage Upload ───────────────────────────────────────────────────────────

/**
 * Upload gambar ke Firebase Storage.
 * Path: uploads/articles/{articleId}/{timestamp}-{filename}
 * 
 * @param {File}   file       — File object dari input[type=file]
 * @param {string} articleId  — ID artikel (gunakan 'temp' jika belum ada ID)
 * @param {function} onProgress — Callback(percent) untuk progress bar
 * @returns {Promise<string>} Download URL gambar
 */
async function fbUploadArticleImage(file, articleId = 'temp', onProgress = null) {
  const ok = await fbInit();
  if (!ok) throw new Error('Firebase Storage belum dikonfigurasi.');

  // Validasi tipe file
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format file tidak diizinkan. Gunakan JPG, JPEG, PNG, atau WEBP.');
  }

  // Validasi ukuran (maks 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran file terlalu besar. Maksimal 5MB.');
  }

  // Import Storage modules
  const { ref, uploadBytesResumable, getDownloadURL } = await import(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js'
  );

  const timestamp  = Date.now();
  const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/articles/${articleId}/${timestamp}-${safeName}`;
  const storageRef  = ref(_fbStorage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      // Progress
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (typeof onProgress === 'function') onProgress(percent);
      },
      // Error
      (err) => {
        console.error('[Firebase Storage] Upload error:', err);
        reject(new Error('Upload gambar gagal: ' + err.message));
      },
      // Success
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

// ─── Articles CRUD (via REST API) ─────────────────────────────────────────────
// Menggunakan JWT token existing dari admin-app.js

/**
 * Ambil semua artikel (including draft) dari API.
 * @param {string} jwtToken — Token JWT dari localStorage
 * @returns {Promise<Array>}
 */
async function fbGetAllArticles(jwtToken) {
  const res = await fetch('/api/articles/all', {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Gagal mengambil daftar artikel');
  }
  return res.json();
}

/**
 * Tambah artikel baru.
 * @param {string} jwtToken
 * @param {object} articleData — { title, content, excerpt, imageUrl, status }
 * @returns {Promise<object>}
 */
async function fbCreateArticle(jwtToken, articleData) {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify(articleData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal menambahkan artikel');
  return data;
}

/**
 * Update artikel yang sudah ada.
 * @param {string} jwtToken
 * @param {string} articleId
 * @param {object} articleData — { title, content, excerpt, imageUrl, status }
 * @returns {Promise<object>}
 */
async function fbUpdateArticle(jwtToken, articleId, articleData) {
  const res = await fetch(`/api/articles/${articleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`
    },
    body: JSON.stringify(articleData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal memperbarui artikel');
  return data;
}

/**
 * Hapus artikel.
 * @param {string} jwtToken
 * @param {string} articleId
 * @returns {Promise<object>}
 */
async function fbDeleteArticle(jwtToken, articleId) {
  const res = await fetch(`/api/articles/${articleId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Gagal menghapus artikel');
  return data;
}

// Ekspos semua fungsi ke window
window.fbInit              = fbInit;
window.fbUploadArticleImage = fbUploadArticleImage;
window.fbGetAllArticles    = fbGetAllArticles;
window.fbCreateArticle     = fbCreateArticle;
window.fbUpdateArticle     = fbUpdateArticle;
window.fbDeleteArticle     = fbDeleteArticle;
