// Operational error with an HTTP status code. Thrown anywhere, formatted by the error middleware.
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
