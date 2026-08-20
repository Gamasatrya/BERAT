/**
 * Articles API Routes
 * Menggunakan Cloud Firestore untuk menyimpan data artikel.
 * 
 * Collection: articles
 * Fields: id, title, slug, content, excerpt, imageUrl, createdAt, updatedAt, status
 * 
 * Routes:
 *   GET    /api/articles          — Artikel published (public)
 *   GET    /api/articles/all      — Semua artikel incl. draft (protected)
 *   GET    /api/articles/:id      — Detail artikel (public)
 *   POST   /api/articles          — Tambah artikel (protected)
 *   PUT    /api/articles/:id      — Edit artikel (protected)
 *   DELETE /api/articles/:id      — Hapus artikel (protected)
 */

const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');

// Lazy-load Firebase Admin untuk menghindari error saat FIREBASE_PROJECT_ID belum diisi
let _db = null;
function getDb() {
  if (_db) return _db;
  try {
    const { getDb: initDb } = require('../firebase-admin');
    _db = initDb();
    return _db;
  } catch (err) {
    throw new Error(
      'Firebase belum dikonfigurasi. Pastikan FIREBASE_PROJECT_ID dan FIREBASE_SERVICE_ACCOUNT ' +
      'sudah diisi di file .env. Detail: ' + err.message
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Buat slug dari judul artikel
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Konversi Firestore document ke plain object
 */
function docToArticle(doc) {
  const data = doc.data();
  return {
    id:        doc.id,
    title:     data.title     || '',
    slug:      data.slug      || '',
    content:   data.content   || '',
    excerpt:   data.excerpt   || '',
    imageUrl:  data.imageUrl  || '',
    status:    data.status    || 'draft',
    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : new Date().toISOString()
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/articles
 * Mengambil semua artikel dengan status "published" (public)
 * Diurutkan berdasarkan createdAt terbaru.
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('articles')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .get();

    const articles = snapshot.docs.map(docToArticle);
    res.json(articles);
  } catch (err) {
    console.error('[Articles] GET / error:', err);
    // Jika Firebase belum dikonfigurasi, kembalikan array kosong
    // agar halaman publik tidak rusak
    if (err.message.includes('Firebase belum dikonfigurasi')) {
      return res.json([]);
    }
    res.status(500).json({ message: 'Gagal mengambil artikel', error: err.message });
  }
});

/**
 * GET /api/articles/all
 * Mengambil SEMUA artikel termasuk draft (protected, admin only)
 */
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('articles')
      .orderBy('createdAt', 'desc')
      .get();

    const articles = snapshot.docs.map(docToArticle);
    res.json(articles);
  } catch (err) {
    console.error('[Articles] GET /all error:', err);
    res.status(500).json({ message: 'Gagal mengambil semua artikel', error: err.message });
  }
});

/**
 * GET /api/articles/:id
 * Detail artikel berdasarkan ID (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const db  = getDb();
    const doc = await db.collection('articles').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    res.json(docToArticle(doc));
  } catch (err) {
    console.error('[Articles] GET /:id error:', err);
    res.status(500).json({ message: 'Gagal mengambil artikel', error: err.message });
  }
});

/**
 * POST /api/articles
 * Tambah artikel baru (protected)
 * 
 * Body: { title, content, excerpt, imageUrl, status }
 */
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, excerpt, imageUrl, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Judul dan konten artikel wajib diisi' });
  }

  try {
    const db        = getDb();
    const now       = new Date();
    const slug      = createSlug(title);
    const admin     = require('firebase-admin');
    const Timestamp = admin.firestore.Timestamp;

    const articleData = {
      title:     title.trim(),
      slug,
      content:   content.trim(),
      excerpt:   (excerpt || '').trim(),
      imageUrl:  imageUrl || '',
      status:    status || 'draft',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    };

    const docRef = await db.collection('articles').add(articleData);

    res.status(201).json({
      message: 'Artikel berhasil ditambahkan',
      article: {
        id:        docRef.id,
        ...articleData,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    });
  } catch (err) {
    console.error('[Articles] POST / error:', err);
    res.status(500).json({ message: 'Gagal menambahkan artikel', error: err.message });
  }
});

/**
 * PUT /api/articles/:id
 * Edit artikel yang sudah ada (protected)
 * 
 * Body: { title, content, excerpt, imageUrl, status }
 */
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, content, excerpt, imageUrl, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Judul dan konten artikel wajib diisi' });
  }

  try {
    const db  = getDb();
    const ref = db.collection('articles').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    const admin     = require('firebase-admin');
    const Timestamp = admin.firestore.Timestamp;

    const updates = {
      title:     title.trim(),
      slug:      createSlug(title),
      content:   content.trim(),
      excerpt:   (excerpt || '').trim(),
      imageUrl:  imageUrl !== undefined ? imageUrl : doc.data().imageUrl,
      status:    status || doc.data().status,
      updatedAt: Timestamp.fromDate(new Date())
    };

    await ref.update(updates);

    res.json({
      message: 'Artikel berhasil diperbarui',
      article: { id: req.params.id, ...updates, updatedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.error('[Articles] PUT /:id error:', err);
    res.status(500).json({ message: 'Gagal memperbarui artikel', error: err.message });
  }
});

/**
 * DELETE /api/articles/:id
 * Hapus artikel (protected)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db  = getDb();
    const ref = db.collection('articles').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    await ref.delete();

    res.json({ message: 'Artikel berhasil dihapus', id: req.params.id });
  } catch (err) {
    console.error('[Articles] DELETE /:id error:', err);
    res.status(500).json({ message: 'Gagal menghapus artikel', error: err.message });
  }
});

module.exports = router;
