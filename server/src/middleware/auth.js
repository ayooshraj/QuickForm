const { verifyToken } = require('../utils/token');
const AppError = require('../utils/AppError');

// 1) Authentication: is there a valid JWT? Attaches req.user = { id, orgId, role }.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Authentication required'));
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, orgId: payload.orgId, role: payload.role };
    return next();
  } catch (err) {
    return next(new AppError(401, 'Invalid or expired token'));
  }
}

// 2) Authorisation (RBAC): is this role allowed on this route?
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
