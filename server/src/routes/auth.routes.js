const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/auth.controller');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });
const email = body('email').trim().isEmail().withMessage('valid email required').toLowerCase();

router.post('/register', authLimiter,
  [body('orgName').trim().notEmpty(), body('name').trim().notEmpty(), email, body('password').isLength({ min: 6 })],
  validate, asyncHandler(ctrl.register));
router.post('/login', authLimiter, [email, body('password').notEmpty()], validate, asyncHandler(ctrl.login));
router.get('/me', authenticate, asyncHandler(ctrl.me));

module.exports = router;
