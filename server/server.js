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
