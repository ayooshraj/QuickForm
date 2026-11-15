const cloudinary = require('cloudinary').v2;
const Form = require('../models/Form');
const Response = require('../models/Response');
const AppError = require('../utils/AppError');
const env = require('../config/env');
const { validateAnswers } = require('../services/answerValidator');
const { emitTo, rooms } = require('../socket');

async function findPublishedForm(slug) {
  const form = await Form.findOne({ slug });
  if (!form || form.status === 'draft') throw new AppError(404, 'Form not found');
  return form;
}

// GET /api/public/forms/:slug: what a respondent needs to render the form (no internal ids)
exports.getPublicForm = async (req, res) => {
  const form = await findPublishedForm(req.params.slug);
  res.json({
    form: {
      title: form.title, description: form.description, fields: form.fields,
      acceptingResponses: form.status === 'published',
    },
  });
};

// POST /api/public/forms/:slug/responses   { answers: { [fieldKey]: value } }
exports.submitResponse = async (req, res) => {
  const form = await findPublishedForm(req.params.slug);
  if (form.status !== 'published') throw new AppError(410, 'This form is no longer accepting responses');

  const { clean, errors, valid } = validateAnswers(form, req.body.answers || {});
  if (!valid) throw new AppError(400, 'Please fix the highlighted fields', errors);

  const response = await Response.create({
    orgId: form.orgId, formId: form._id, answers: clean,
    meta: { userAgent: String(req.headers['user-agent'] || '').slice(0, 200) },
  });
  // Atomic counter keeps the forms list fast without counting responses every time.
  const updated = await Form.findByIdAndUpdate(form._id, { $inc: { responseCount: 1 } }, { new: true });

  // Real-time: dashboards watching this form, and the whole org's form list, update instantly.
  const payload = { formId: form._id, responseId: response._id, responseCount: updated.responseCount, createdAt: response.createdAt };
  emitTo(rooms.form(form._id), 'response:new', { ...payload, answers: clean });
  emitTo(rooms.org(form.orgId), 'form:count', payload);

  res.status(201).json({ ok: true, id: response._id });
};

// GET /api/public/forms/:slug/upload-signature
// Signed direct upload: the browser uploads the file straight to Cloudinary
// (our server never handles the file bytes), but only with a signature we issue,
// so nobody can use our Cloudinary account without going through a real form.
exports.uploadSignature = async (req, res) => {
  const form = await findPublishedForm(req.params.slug);
  if (!form.fields.some((f) => f.type === 'file')) throw new AppError(400, 'This form has no file fields');
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) throw new AppError(503, 'File uploads are not configured');

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `quickform/${form.orgId}/${form._id}`;
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret);
  res.json({ cloudName, apiKey, timestamp, folder, signature });
};
