// middleware/errorHandler.js
const logger = require('../utils/logger');
const multer = require('multer'); // Added multer import

const errorHandler = (err, req, res, next) => {
  // Handle multer-specific errors
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', {
      message: err.message,
      code: err.code,
      ...getErrorContext(req)
    });
    return res.status(400).json({
      status: 'error',
      code: 'MULTER_ERROR',
      message: err.message,
      ...getErrorContext(req)
    });
  }

  // Existing error types
  const errorTypes = {
    ValidationError: { status: 400, code: 'VALIDATION_ERROR' },
    AuthenticationError: { status: 401, code: 'AUTHENTICATION_ERROR' },
    AuthorizationError: { status: 403, code: 'AUTHORIZATION_ERROR' },
    NotFoundError: { status: 404, code: 'NOT_FOUND' },
    ConflictError: { status: 409, code: 'CONFLICT_ERROR' }
  };

  const errorInfo = errorTypes[err.name] || { status: 500, code: 'INTERNAL_SERVER_ERROR' };

  const errorContext = getErrorContext(req);

  logger.error('Application error:', {
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

/**
 * Helper function to extract error context.
 * @param {Object} req - Express request object.
 * @returns {Object} - Extracted context information.
 */
const getErrorContext = (req) => ({
  timestamp: new Date().toISOString(),
  path: req.path,
  method: req.method,
  ip: req.ip,
  userId: req.user?.userId,
});

/**
 * Base class for custom errors.
 */
class BaseError extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ValidationError - Represents validation-related errors.
 */
class ValidationError extends BaseError {
  constructor(message) {
    super(message, 'ValidationError');
  }
}

/**
 * AuthenticationError - Represents authentication failures.
 */
class AuthenticationError extends BaseError {
  constructor(message) {
    super(message, 'AuthenticationError');
  }
}

/**
 * AuthorizationError - Represents authorization failures.
 */
class AuthorizationError extends BaseError {
  constructor(message) {
    super(message, 'AuthorizationError');
  }
}

/**
 * NotFoundError - Represents resource not found errors.
 */
class NotFoundError extends BaseError {
  constructor(message) {
    super(message, 'NotFoundError');
  }
}

/**
 * ConflictError - Represents conflict errors (e.g., duplicate entries).
 */
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
