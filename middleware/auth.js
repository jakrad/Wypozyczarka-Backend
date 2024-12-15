// middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    logger.info('Próba dostępu bez tokena autoryzacyjnego');
    return res.status(401).json({ 
      status: 'error',
      message: 'Brak tokena, dostęp zabroniony' 
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    logger.info('Próba dostępu z nieprawidłowym formatem tokena');
    return res.status(401).json({ 
      status: 'error',
      message: 'Nieprawidłowy format tokena' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TwojSekretnyToken');
    logger.info(`Pomyślna weryfikacja tokena dla użytkownika ID: ${decoded.userId}`);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    const errorDetails = {
      type: error.name,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    logger.error('Błąd weryfikacji tokena:', errorDetails);

    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({
          status: 'error',
          message: 'Token wygasł'
        });
      case 'JsonWebTokenError':
        return res.status(401).json({
          status: 'error',
          message: 'Nieprawidłowy token'
        });
      case 'NotBeforeError':
        return res.status(401).json({
          status: 'error',
          message: 'Token jeszcze nie jest aktywny'
        });
      default:
        return res.status(401).json({
          status: 'error',
          message: 'Błąd weryfikacji tokena'
        });
    }
  }
};
