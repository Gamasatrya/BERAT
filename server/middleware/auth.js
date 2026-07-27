const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Akses ditolak. Token tidak disediakan.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'heti_secret_key_2026_safety_first');
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
  }
};
