const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const submissionsPath = path.join(__dirname, '../../data/submissions.json');

// Helper to read submissions
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

// Helper to write submissions
const writeSubmissions = (data) => {
  fs.writeFileSync(submissionsPath, JSON.stringify(data, null, 2));
};

// @route   POST /api/contact
// @desc    Submit contact form (public)
router.post('/', (req, res) => {
  try {
    const { name, email, phone, program, message } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: 'Kolom Nama, Email, Telepon, dan Pesan wajib diisi' });
    }

    const submissions = readSubmissions();
    const newSubmission = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      program: program || '-',
      message,
      read: false,
      createdAt: new Date().toISOString()
    };

    submissions.push(newSubmission);
    writeSubmissions(submissions);

    res.status(201).json({ message: 'Pesan berhasil dikirim', data: newSubmission });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengirim pesan', error: error.message });
  }
});

// @route   GET /api/submissions
// @desc    Get all form submissions (protected)
router.get('/', authMiddleware, (req, res) => {
  try {
    const submissions = readSubmissions();
    // Sort by latest
    const sorted = submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat pesan masuk', error: error.message });
  }
});

// @route   PUT /api/submissions/:id
// @desc    Mark submission as read (protected)
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    const submissions = readSubmissions();
    const index = submissions.findIndex(item => item.id === id);

    if (index === -1) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan' });
    }

    submissions[index].read = true;
    writeSubmissions(submissions);

    res.json({ message: 'Pesan ditandai sebagai dibaca', data: submissions[index] });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui status pesan', error: error.message });
  }
});

// @route   DELETE /api/submissions/:id
// @desc    Delete a submission (protected)
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const id = req.params.id;
    let submissions = readSubmissions();
    const exists = submissions.some(item => item.id === id);

    if (!exists) {
      return res.status(404).json({ message: 'Pesan tidak ditemukan' });
    }

    submissions = submissions.filter(item => item.id !== id);
    writeSubmissions(submissions);

    res.json({ message: 'Pesan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus pesan', error: error.message });
  }
});

// @route   GET /api/submissions/export
// @desc    Export submissions to CSV (protected)
router.get('/export', authMiddleware, (req, res) => {
  try {
    const submissions = readSubmissions();
    
    // Create CSV Header
    let csvContent = 'ID,Tanggal,Nama,Email,Telepon,Program,Pesan,Status\n';
    
    // Add data rows
    submissions.forEach(item => {
      const date = new Date(item.createdAt).toLocaleString('id-ID');
      const status = item.read ? 'Dibaca' : 'Belum Dibaca';
      
      // Escape quotes and wrap in quotes to handle commas in text
      const name = `"${item.name.replace(/"/g, '""')}"`;
      const email = `"${item.email.replace(/"/g, '""')}"`;
      const phone = `"${item.phone.replace(/"/g, '""')}"`;
      const program = `"${item.program.replace(/"/g, '""')}"`;
      const message = `"${item.message.replace(/"/g, '""')}"`;
      
      csvContent += `${item.id},${date},${name},${email},${phone},${program},${message},${status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=pesan_masuk_heti.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengekspor data', error: error.message });
  }
});

module.exports = router;
