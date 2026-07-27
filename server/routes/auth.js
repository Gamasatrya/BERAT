const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const settingsPath = path.join(__dirname, '../../data/settings.json');

// Helper to read settings
const readSettings = () => {
  if (!fs.existsSync(settingsPath)) {
    // Generate default settings with hashed password "heti2026"
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('heti2026', salt);
    const defaultSettings = {
      username: 'admin',
      passwordHash: hashedPassword,
      siteTitle: 'LPK Buwas Ikigai Nusantara',
      metaDescription: 'Pusat Pelatihan & Sertifikasi Operator Alat Berat Terpercaya di Indonesia'
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
};

// Helper to write settings
const writeSettings = (settings) => {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
};

// @route   POST /api/auth/login
// @desc    Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  const settings = readSettings();

  if (username !== settings.username) {
    return res.status(400).json({ message: 'Username atau password salah' });
  }

  const isMatch = bcrypt.compareSync(password, settings.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Username atau password salah' });
  }

  const payload = { username: settings.username };
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'heti_secret_key_2026_safety_first',
    { expiresIn: '24h' }
  );

  res.json({
    token,
    username: settings.username,
    siteTitle: settings.siteTitle
  });
});

// @route   GET /api/auth/verify
// @desc    Verify current token
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, username: req.admin.username });
});

// @route   PUT /api/auth/password
// @desc    Change admin password
router.put('/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Password lama dan baru wajib diisi' });
  }

  const settings = readSettings();

  const isMatch = bcrypt.compareSync(oldPassword, settings.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ message: 'Password lama salah' });
  }

  const salt = bcrypt.genSaltSync(10);
  settings.passwordHash = bcrypt.hashSync(newPassword, salt);
  writeSettings(settings);

  res.json({ message: 'Password berhasil diubah' });
});

// @route   GET /api/auth/settings
// @desc    Get site settings (public elements like title)
router.get('/settings', (req, res) => {
  const settings = readSettings();
  res.json({
    siteTitle: settings.siteTitle,
    metaDescription: settings.metaDescription
  });
});

// @route   PUT /api/auth/settings
// @desc    Update site settings
router.put('/settings', authMiddleware, (req, res) => {
  const { siteTitle, metaDescription, username } = req.body;
  const settings = readSettings();

  if (siteTitle) settings.siteTitle = siteTitle;
  if (metaDescription) settings.metaDescription = metaDescription;
  if (username) settings.username = username;

  writeSettings(settings);
  res.json({ message: 'Pengaturan berhasil diperbarui', settings: { siteTitle: settings.siteTitle, metaDescription: settings.metaDescription, username: settings.username } });
});

module.exports = router;
module.exports.readSettings = readSettings;
