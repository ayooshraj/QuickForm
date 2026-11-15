const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/user.controller');

router.use(authenticate);
router.get('/', asyncHandler(ctrl.listUsers));
router.post('/', authorize('owner'),
  [
    body('name').trim().notEmpty(),
    body('email').trim().isEmail().toLowerCase(),
    body('password').isLength({ min: 6 }),
    body('role').isIn(['editor', 'viewer']).withMessage('role must be editor or viewer'),
  ],
  validate, asyncHandler(ctrl.createUser));

module.exports = router;
