// middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    logger.info('Attempted access without authorization token');
    return res.status(401).json({ 
      status: 'error',
      message: 'Brak tokena, dostęp zabroniony' 
    });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    logger.info('Attempted access with invalid token format');
    return res.status(401).json({ 
      status: 'error',
      message: 'Nieprawidłowy format tokena' 
    });
  }

  const token = tokenParts[1];
  if (!token) {
    logger.info('Attempted access with missing token');
    return res.status(401).json({ 
      status: 'error',
      message: 'Nieprawidłowy format tokena' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'TwojSekretnyToken');
    logger.info(`Successful token verification for user ID: ${decoded.userId}`);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (error) {
    const errorDetails = {
      type: error.name,
      message: error.message,
      timestamp: new Date().toISOString()
    };
    
    logger.error('Token verification error:', errorDetails);

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
