const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setup storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'img-' + uniqueSuffix + ext);
  }
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Hanya diperbolehkan mengupload file gambar (jpeg, jpg, png, webp, gif)'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// @route   GET /api/media
// @desc    List all media files (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    const mediaList = files
      .filter(file => !file.startsWith('.'))
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          id: file,
          name: file,
          url: `/uploads/${file}`,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(mediaList);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat media', error: error.message });
  }
});

// @route   POST /api/media/upload
// @desc    Upload single image (protected)
router.post('/upload', authMiddleware, (req, res) => {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file terlalu besar. Maksimal 5MB.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Silakan pilih file gambar untuk diupload' });
    }

    res.status(201).json({
      message: 'Gambar berhasil diupload',
      file: {
        id: req.file.filename,
        name: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size
      }
    });
  });
});

// @route   DELETE /api/media/:id
// @desc    Delete media file (protected)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const filename = req.params.id;
    // Prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: 'Permintaan tidak valid' });
    }

    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Media tidak ditemukan' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Media berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus media', error: error.message });
  }
});

module.exports = router;
