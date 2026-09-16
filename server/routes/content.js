const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const dataDir = path.join(__dirname, '../../data');
const contentPath = path.join(dataDir, 'content.json');
const galleryPath = path.join(dataDir, 'gallery.json');
const testimonialsPath = path.join(dataDir, 'testimonials.json');
const partnersPath = path.join(dataDir, 'partners.json');
const faqPath = path.join(dataDir, 'faq.json');

// Per-page gallery file paths
const PAGE_GALLERY_MAP = {
  lpk:       path.join(dataDir, 'gallery-lpk.json'),
  procool:   path.join(dataDir, 'gallery-procool.json'),
  legal:     path.join(dataDir, 'gallery-legal.json'),
  geoteknik: path.join(dataDir, 'gallery-geoteknik.json'),
};

// Helper to read JSON safely
const readJson = (filePath, defaultData = {}) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Helper to write JSON safely
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// @route   GET /api/content
// @desc    Get all website public content combined
router.get('/', (req, res) => {
  const content = readJson(contentPath, {});
  const gallery = readJson(galleryPath, []);
  const testimonials = readJson(testimonialsPath, []);
  const partners = readJson(partnersPath, []);
  const faq = readJson(faqPath, []);

  res.json({
    content,
    gallery,
    testimonials,
    partners,
    faq
  });
});

// @route   GET /api/content/sections
// @desc    Get raw section content
router.get('/sections', (req, res) => {
  res.json(readJson(contentPath, {}));
});

// @route   PUT /api/content/sections
// @desc    Update section content (protected)
router.put('/sections', authMiddleware, (req, res) => {
  const data = req.body;
  writeJson(contentPath, data);
  res.json({ message: 'Konten sections berhasil diperbarui', data });
});

// @route   GET /api/content/gallery/:page
// @desc    Get per-page gallery — lpk, procool, legal, or geoteknik
router.get('/gallery/:page', (req, res) => {
  const page = req.params.page;
  const filePath = PAGE_GALLERY_MAP[page];
  if (!filePath) {
    return res.status(404).json({ message: `Halaman '${page}' tidak ditemukan` });
  }
  res.json(readJson(filePath, []));
});

// @route   PUT /api/content/gallery/:page
// @desc    Update per-page gallery (protected)
router.put('/gallery/:page', authMiddleware, (req, res) => {
  const page = req.params.page;
  const filePath = PAGE_GALLERY_MAP[page];
  if (!filePath) {
    return res.status(404).json({ message: `Halaman '${page}' tidak ditemukan` });
  }
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ message: 'Data galeri harus berupa array' });
  }
  writeJson(filePath, data);
  res.json({ message: `Galeri ${page} berhasil diperbarui`, data });
});

// @route   GET /api/content/gallery
// @desc    Get shared gallery items (backward compat)
router.get('/gallery', (req, res) => {
  res.json(readJson(galleryPath, []));
});

// @route   PUT /api/content/gallery
// @desc    Update shared gallery items (protected)
router.put('/gallery', authMiddleware, (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ message: 'Data galeri harus berupa array' });
  }
  writeJson(galleryPath, data);
  res.json({ message: 'Data galeri berhasil diperbarui', data });
});

// @route   GET /api/content/testimonials
router.get('/testimonials', (req, res) => {
  res.json(readJson(testimonialsPath, []));
});

// @route   PUT /api/content/testimonials (protected)
router.put('/testimonials', authMiddleware, (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ message: 'Data testimoni harus berupa array' });
  }
  writeJson(testimonialsPath, data);
  res.json({ message: 'Data testimoni berhasil diperbarui', data });
});

// @route   GET /api/content/partners
router.get('/partners', (req, res) => {
  res.json(readJson(partnersPath, []));
});

// @route   PUT /api/content/partners (protected)
router.put('/partners', authMiddleware, (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ message: 'Data mitra harus berupa array' });
  }
  writeJson(partnersPath, data);
  res.json({ message: 'Data mitra berhasil diperbarui', data });
});

// @route   GET /api/content/faq
router.get('/faq', (req, res) => {
  res.json(readJson(faqPath, []));
});

// @route   PUT /api/content/faq (protected)
router.put('/faq', authMiddleware, (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ message: 'Data FAQ harus berupa array' });
  }
  writeJson(faqPath, data);
  res.json({ message: 'Data FAQ berhasil diperbarui', data });
});

module.exports = router;
