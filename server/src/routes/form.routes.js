const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ctrl = require('../controllers/form.controller');

// Role matrix:
//            create/edit/publish   view responses + CSV   analytics   delete
//  owner          yes                   yes                yes         yes
//  editor         yes                   yes                yes         no
//  viewer         no                    no                 yes         no
const canEdit = authorize('owner', 'editor');

router.use(authenticate);

router.get('/', asyncHandler(ctrl.listForms));
router.post('/', canEdit, [body('title').trim().isLength({ min: 1, max: 150 })], validate, asyncHandler(ctrl.createForm));
router.get('/:id', asyncHandler(ctrl.getForm));
router.put('/:id', canEdit, [body('title').optional().trim().isLength({ min: 1, max: 150 })], validate, asyncHandler(ctrl.updateForm));
router.patch('/:id/status', canEdit, [body('status').isIn(['draft', 'published', 'closed'])], validate, asyncHandler(ctrl.setStatus));
router.delete('/:id', authorize('owner'), asyncHandler(ctrl.deleteForm));

router.get('/:id/responses', canEdit, asyncHandler(ctrl.listResponses));
router.get('/:id/export.csv', canEdit, asyncHandler(ctrl.exportCsv));
router.get('/:id/analytics', asyncHandler(ctrl.analytics));

module.exports = router;
