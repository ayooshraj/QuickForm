const jwt = require('jsonwebtoken');
const env = require('../config/env');

// The JWT carries just enough to authorise a request without a DB lookup:
// who the user is, which tenant they belong to, and their role.
function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), orgId: String(user.orgId), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signToken, verifyToken };
