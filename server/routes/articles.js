/**
 * Articles API Routes
 * Menggunakan Cloud Firestore untuk menyimpan data artikel dengan Fallback ke Local JSON (data/articles.json).
 * 
 * Collection / File: articles
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
const fs             = require('fs');
const path           = require('path');
const authMiddleware = require('../middleware/auth');

const dataDir = path.join(__dirname, '../../data');
const articlesJsonPath = path.join(dataDir, 'articles.json');

// ─── Local JSON Storage Helpers ──────────────────────────────────────────────

function readLocalArticles() {
  if (!fs.existsSync(articlesJsonPath)) {
    const initialArticles = [
      {
        id: 'art-1',
        title: 'Mengenal Sertifikasi BNSP Operator Alat Berat',
        slug: 'mengenal-sertifikasi-bnsp-operator-alat-berat',
        excerpt: 'Pentingnya sertifikasi resmi BNSP untuk karir profesional operator excavator, bulldozer, dan loader.',
        content: '<p>Sertifikasi BNSP (Badan Nasional Sertifikasi Profesi) merupakan bukti kompetensi resmi yang diakui secara nasional maupun internasional bagi operator alat berat.</p><p>Di LPK Buwas Ikigai Nusantara, peserta diberikan pelatihan teori keselamatan kerja, perawatan unit, serta praktek lapangan secara intensif hingga lulus uji kompetensi.</p>',
        imageUrl: '/assets/images/heavy-equipment.png',
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'art-2',
        title: 'Panduan Perawatan Sistem HVAC & AC Komersial',
        slug: 'panduan-perawatan-sistem-hvac-ac-komersial',
        excerpt: 'Tips menjaga efisiensi dan daya tahan sistem pendingin gedung serta industri bersama Procool.',
        content: '<p>Sistem HVAC yang terawat dengan baik dapat menghemat konsumsi energi hingga 30% dan mencegah kerusakan mendadak pada unit chiller dan AHU.</p><p>Procool memberikan layanan pemeliharaan berkala dan perbaikan cepat oleh teknisi tersertifikasi.</p>',
        imageUrl: '/assets/images/procool-bg.jpg',
        status: 'published',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(articlesJsonPath, JSON.stringify(initialArticles, null, 2));
    return initialArticles;
  }
  try {
    return JSON.parse(fs.readFileSync(articlesJsonPath, 'utf8'));
  } catch (err) {
    return [];
  }
}

function writeLocalArticles(articles) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(articlesJsonPath, JSON.stringify(articles, null, 2));
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

let _db = null;
function getDb() {
  if (_db) return _db;
  const { getDb: initDb } = require('../firebase-admin');
  _db = initDb();
  return _db;
}

function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
    createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
    updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt) : new Date().toISOString()
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/articles
 * Artikel status "published" (public)
 */
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('articles')
      .where('status', '==', 'published')
      .orderBy('createdAt', 'desc')
      .get();

    const articles = snapshot.docs.map(docToArticle);
    return res.json(articles);
  } catch (err) {
    console.warn('[Articles] Firestore query fallback to local JSON:', err.message);
    const local = readLocalArticles();
    const published = local
      .filter(a => a.status === 'published')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(published);
  }
});

/**
 * GET /api/articles/all
 * Semua artikel incl. draft (protected)
 */
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const snapshot = await db.collection('articles')
      .orderBy('createdAt', 'desc')
      .get();

    const articles = snapshot.docs.map(docToArticle);
    return res.json(articles);
  } catch (err) {
    console.warn('[Articles] Firestore query fallback to local JSON:', err.message);
    const local = readLocalArticles();
    local.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(local);
  }
});

/**
 * GET /api/articles/:id
 * Detail artikel (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const db  = getDb();
    const doc = await db.collection('articles').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    return res.json(docToArticle(doc));
  } catch (err) {
    console.warn('[Articles] Firestore query fallback to local JSON:', err.message);
    const local = readLocalArticles();
    const article = local.find(a => a.id === req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }
    return res.json(article);
  }
});

/**
 * POST /api/articles
 * Tambah artikel baru (protected)
 */
router.post('/', authMiddleware, async (req, res) => {
  const { title, content, excerpt, imageUrl, status } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Judul dan konten artikel wajib diisi' });
  }

  const now  = new Date();
  const slug = createSlug(title);

  try {
    const db        = getDb();
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

    return res.status(201).json({
      message: 'Artikel berhasil ditambahkan',
      article: {
        id:        docRef.id,
        ...articleData,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    });
  } catch (err) {
    console.warn('[Articles] Firestore POST fallback to local JSON:', err.message);
    const local = readLocalArticles();
    const newArticle = {
      id:        'art-' + Date.now(),
      title:     title.trim(),
      slug,
      content:   content.trim(),
      excerpt:   (excerpt || '').trim(),
      imageUrl:  imageUrl || '',
      status:    status || 'draft',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    local.unshift(newArticle);
    writeLocalArticles(local);

    return res.status(201).json({
      message: 'Artikel berhasil ditambahkan',
      article: newArticle
    });
  }
});

/**
 * PUT /api/articles/:id
 * Edit artikel (protected)
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

    return res.json({
      message: 'Artikel berhasil diperbarui',
      article: { id: req.params.id, ...updates, updatedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.warn('[Articles] Firestore PUT fallback to local JSON:', err.message);
    const local = readLocalArticles();
    const index = local.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    const updatedArticle = {
      ...local[index],
      title:     title.trim(),
      slug:      createSlug(title),
      content:   content.trim(),
      excerpt:   (excerpt || '').trim(),
      imageUrl:  imageUrl !== undefined ? imageUrl : local[index].imageUrl,
      status:    status || local[index].status,
      updatedAt: new Date().toISOString()
    };
    local[index] = updatedArticle;
    writeLocalArticles(local);

    return res.json({
      message: 'Artikel berhasil diperbarui',
      article: updatedArticle
    });
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

    return res.json({ message: 'Artikel berhasil dihapus', id: req.params.id });
  } catch (err) {
    console.warn('[Articles] Firestore DELETE fallback to local JSON:', err.message);
    const local = readLocalArticles();
    const index = local.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Artikel tidak ditemukan' });
    }

    local.splice(index, 1);
    writeLocalArticles(local);

    return res.json({ message: 'Artikel berhasil dihapus', id: req.params.id });
  }
});

module.exports = router;

