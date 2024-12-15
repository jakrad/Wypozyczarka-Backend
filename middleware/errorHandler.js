// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const errorTypes = {
    ValidationError: { status: 400, code: 'VALIDATION_ERROR' },
    AuthenticationError: { status: 401, code: 'AUTHENTICATION_ERROR' },
    AuthorizationError: { status: 403, code: 'AUTHORIZATION_ERROR' },
    NotFoundError: { status: 404, code: 'NOT_FOUND' },
    ConflictError: { status: 409, code: 'CONFLICT_ERROR' }
  };

  const errorInfo = errorTypes[err.name] || { status: 500, code: 'INTERNAL_SERVER_ERROR' };

  const errorContext = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
    code: errorInfo.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  logger.error('Błąd aplikacji:', {
    message: err.message,
    ...errorContext
  });

  res.status(errorInfo.status).json({
    status: 'error',
    code: errorInfo.code,
    message: err.message || 'Błąd serwera',
    ...errorContext,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

class BaseError extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends BaseError {
  constructor(message) {
    super(message, 'ValidationError');
  }
}

class AuthenticationError extends BaseError {
  constructor(message) {
    super(message, 'AuthenticationError');
  }
}

class AuthorizationError extends BaseError {
  constructor(message) {
    super(message, 'AuthorizationError');
  }
}

class NotFoundError extends BaseError {
  constructor(message) {
    super(message, 'NotFoundError');
  }
}

class ConflictError extends BaseError {
  constructor(message) {
    super(message, 'ConflictError');
  }
}

module.exports = {
  errorHandler,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
};
