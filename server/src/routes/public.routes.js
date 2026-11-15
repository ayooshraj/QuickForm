const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/public.controller');

// Public endpoints need no login, so they are rate-limited per IP to stop spam floods.
const submitLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

router.get('/forms/:slug', asyncHandler(ctrl.getPublicForm));
router.post('/forms/:slug/responses', submitLimiter, asyncHandler(ctrl.submitResponse));
router.get('/forms/:slug/upload-signature', submitLimiter, asyncHandler(ctrl.uploadSignature));

module.exports = router;
