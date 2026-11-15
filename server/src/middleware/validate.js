const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Runs after express-validator rule chains; turns failures into a 400.
module.exports = function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(new AppError(400, 'Validation failed', details));
};
