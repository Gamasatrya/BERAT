const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/content', require('./routes/content'));
app.use('/api/media', require('./routes/media'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/articles', require('./routes/articles')); // Firebase articles

// Firebase Client Config endpoint (expose only public config, never expose service account)
app.get('/api/firebase-config', (req, res) => {
  const config = {
    apiKey:            process.env.FIREBASE_API_KEY            || '',
    authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
    projectId:         process.env.FIREBASE_PROJECT_ID         || '',
    storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId:             process.env.FIREBASE_APP_ID             || ''
  };

  // Cek apakah Firebase sudah dikonfigurasi
  if (!config.projectId) {
    return res.status(503).json({
      configured: false,
      message: 'Firebase belum dikonfigurasi. Isi FIREBASE_PROJECT_ID di .env'
    });
  }

  res.json(config);
});

// Clean explicit page routes
app.get('/lpk', (req, res) => res.sendFile(path.join(__dirname, '../lpk.html')));
app.get('/procool', (req, res) => res.sendFile(path.join(__dirname, '../procool.html')));
app.get('/konsultasi-hukum', (req, res) => res.sendFile(path.join(__dirname, '../konsultasi-hukum.html')));
app.get('/jasa-geoteknik', (req, res) => res.sendFile(path.join(__dirname, '../jasa-geoteknik.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../admin.html')));

// Serve public static files (from the project root)
app.use(express.static(path.join(__dirname, '../')));

// Fallback for Single Page Application routing or 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` BIN Server running on port ${PORT}`);
  console.log(` Website: http://localhost:${PORT}`);
  console.log(` Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`=================================================`);
});
