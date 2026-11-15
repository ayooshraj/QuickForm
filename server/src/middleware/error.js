const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Single place where every error becomes a consistent JSON response.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') { status = 400; message = 'Invalid id'; }
  if (err.code === 11000) { status = 409; message = 'Duplicate value'; }
  if (err.name === 'ValidationError') { status = 400; }

  if (status === 500 && process.env.NODE_ENV !== 'test') console.error(err);
  res.status(status).json({ error: message, ...(err.details ? { details: err.details } : {}) });
}

module.exports = { notFound, errorHandler };
