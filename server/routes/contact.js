const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const submissionsPath = path.join(__dirname, '../../data/submissions.json');

// Memory cache & Firestore lazy load
let _firestoreDisabled = false;
let _db = null;

function getFirestoreDb() {
  if (_firestoreDisabled) return null;
  if (_db) return _db;
  try {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Avoid hanging Application Default Credentials lookup when service account is absent
      _firestoreDisabled = true;
      return null;
    }
    const { getDb } = require('../firebase-admin');
    _db = getDb();
    return _db;
  } catch (err) {
    _firestoreDisabled = true;
    return null;
  }
}

// Helper to read local submissions JSON
const readSubmissions = () => {
  if (!fs.existsSync(submissionsPath)) {
    fs.writeFileSync(submissionsPath, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(submissionsPath, 'utf8'));
  } catch (error) {
    return [];
  }
};

// Helper to write local submissions JSON
const writeSubmissions = (data) => {
  fs.writeFileSync(submissionsPath, JSON.stringify(data, null, 2));
};

// Map default serviceName based on serviceType
const getServiceName = (serviceType, customName) => {
  if (customName && customName.trim() !== '') return customName.trim();
  switch (serviceType) {
    case 'lpk':
      return 'LPK Buwas Ikigai Nusantara';
    case 'procool':
      return 'Procool';
    case 'legal':
      return 'Konsultasi Hukum';
    case 'geoteknik':
      return 'Jasa Geoteknik';
    default:
      return 'LPK Buwas Ikigai Nusantara';
  }
};

// @route   POST /api/contact
// @desc    Submit contact form (public)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, program, message, serviceType, serviceName, service } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Kolom Nama Lengkap wajib diisi' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Kolom Nomor Telepon / WhatsApp wajib diisi' });
    }

    const resolvedProgram = (program || service || '').trim();
    if (!resolvedProgram) {
      return res.status(400).json({ message: 'Pilihan layanan / program wajib dipilih' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Kolom Pesan / detail kebutuhan wajib diisi' });
    }

    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    const resolvedServiceType = (serviceType || 'lpk').toLowerCase();
    const resolvedServiceName = getServiceName(resolvedServiceType, serviceName || service);
    const nowIso = new Date().toISOString();

    const newSubmission = {
      id: Date.now().toString(),
      name,
      email: email || '',
      phone,
      program: program || service || '-',
      message: message || '',
      serviceType: resolvedServiceType,
      serviceName: resolvedServiceName,
      status: 'new',
      read: false,
      submittedAt: nowIso,
      createdAt: nowIso
    };

    // 1. Instant local write
    const submissions = readSubmissions();
    submissions.unshift(newSubmission);
    writeSubmissions(submissions);

    // 2. Respond immediately to user (< 5ms)
    res.status(201).json({ message: 'Pesan berhasil dikirim', data: newSubmission });

    // 3. Background Firestore sync (fire-and-forget)
    setImmediate(async () => {
      try {
        const db = getFirestoreDb();
        if (db) {
          await db.collection('submissions').doc(newSubmission.id).set(newSubmission);
        }
      } catch (e) {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengirim pesan', error: error.message });
  }
});

// @route   GET /api/submissions or GET /api/contact
// @desc    Get all form submissions with optional ?serviceType= filter (protected or public)
router.get('/', async (req, res) => {
  try {
    const filterService = req.query.serviceType ? req.query.serviceType.toLowerCase() : null;

    // Load local JSON submissions instantly
    let submissionsList = readSubmissions().map(sub => ({
      ...sub,
      serviceType: sub.serviceType || 'lpk',
      serviceName: sub.serviceName || getServiceName(sub.serviceType || 'lpk'),
      status: sub.status || (sub.read ? 'read' : 'new'),
      submittedAt: sub.submittedAt || sub.createdAt || new Date().toISOString(),
      createdAt: sub.createdAt || sub.submittedAt || new Date().toISOString()
    }));

    // Filter by serviceType if requested
    if (filterService && filterService !== 'all') {
      submissionsList = submissionsList.filter(s => (s.serviceType || '').toLowerCase() === filterService);
    }

    // Sort descending by date
    submissionsList.sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt));

    res.json(submissionsList);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat pesan masuk', error: error.message });
  }
});

// @route   PUT /api/submissions/:id or PUT /api/contact/:id
// @desc    Update submission status / read state (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const { status, read } = req.body;

    const submissions = readSubmissions();
    const index = submissions.findIndex(item => item.id === id);

    if (index === -1) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan' });
    }

    if (status) {
      submissions[index].status = status;
      if (status === 'read' || status === 'in_progress' || status === 'completed') {
        submissions[index].read = true;
      }
    }
    if (typeof read === 'boolean') {
      submissions[index].read = read;
      if (read && (!submissions[index].status || submissions[index].status === 'new')) {
        submissions[index].status = 'read';
      }
    }

    writeSubmissions(submissions);
    const updatedDoc = submissions[index];

    // Respond immediately (< 5ms)
    res.json({ message: 'Pesan berhasil diperbarui', data: updatedDoc });

    // Background Firestore update
    setImmediate(async () => {
      try {
        const db = getFirestoreDb();
        if (db) {
          await db.collection('submissions').doc(id).update({
            status: updatedDoc.status,
            read: updatedDoc.read
          });
        }
      } catch (e) {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui status pesan', error: error.message });
  }
});

// @route   DELETE /api/submissions/:id or DELETE /api/contact/:id
// @desc    Delete a submission (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;

    let submissions = readSubmissions();
    submissions = submissions.filter(item => item.id !== id);
    writeSubmissions(submissions);

    // Respond immediately
    res.json({ message: 'Pesan berhasil dihapus' });

    // Background Firestore delete
    setImmediate(async () => {
      try {
        const db = getFirestoreDb();
        if (db) {
          await db.collection('submissions').doc(id).delete();
        }
      } catch (e) {}
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus pesan', error: error.message });
  }
});

// @route   GET /api/submissions/export
// @desc    Export submissions to CSV (protected)
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const submissions = readSubmissions();
    submissions.sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt));

    let csvContent = 'ID,Tanggal,Service,Nama,Email,Telepon,Program/Kebutuhan,Pesan,Status\n';

    submissions.forEach(item => {
      const date = new Date(item.submittedAt || item.createdAt).toLocaleString('id-ID');
      const serviceName = item.serviceName || getServiceName(item.serviceType);
      const statusLabel = item.status || (item.read ? 'read' : 'new');

      const name = `"${(item.name || '').replace(/"/g, '""')}"`;
      const email = `"${(item.email || '').replace(/"/g, '""')}"`;
      const phone = `"${(item.phone || '').replace(/"/g, '""')}"`;
      const program = `"${(item.program || '').replace(/"/g, '""')}"`;
      const message = `"${(item.message || '').replace(/"/g, '""')}"`;
      const serviceStr = `"${serviceName.replace(/"/g, '""')}"`;

      csvContent += `${item.id},${date},${serviceStr},${name},${email},${phone},${program},${message},${statusLabel}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=pesan_masuk_buwas.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengekspor data', error: error.message });
  }
});

module.exports = router;

