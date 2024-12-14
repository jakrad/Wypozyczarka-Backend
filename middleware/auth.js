// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Brak tokena, dostęp zabroniony' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Nieprawidłowy token, dostęp zabroniony' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TwojSekretnyToken');
    console.log('Decoded Token:', decoded);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    console.error('Błąd weryfikacji tokenu:', err);
    res.status(401).json({ message: 'Nieprawidłowy token dostęp zabroniony' });
  }
};
