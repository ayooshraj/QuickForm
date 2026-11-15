const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const Form = require('../models/Form');
const Response = require('../models/Response');
const AppError = require('../utils/AppError');
const { CHOICE_TYPES, FIELD_TYPES } = require('../models/Form');
const { buildAnalytics } = require('../services/analytics');
const { responsesToCsv } = require('../services/csv');

// Every lookup is scoped by orgId from the JWT → tenant isolation.
async function findOrgForm(user, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Invalid id');
  const form = await Form.findOne({ _id: id, orgId: user.orgId });
  if (!form) throw new AppError(404, 'Form not found');
  return form;
}

// Normalise and sanity-check the field list coming from the builder.
function normaliseFields(fields = []) {
  if (!Array.isArray(fields)) throw new AppError(400, 'fields must be an array');
  if (fields.length > 50) throw new AppError(400, 'A form can have at most 50 fields');
  const seen = new Set();
  return fields.map((f, i) => {
    if (!f || !f.label || !String(f.label).trim()) throw new AppError(400, `Field ${i + 1} needs a label`);
    if (!FIELD_TYPES.includes(f.type)) throw new AppError(400, `Field ${i + 1} has an invalid type`);
    const key = f.key || `f_${nanoid(6)}`;
    if (seen.has(key)) throw new AppError(400, `Duplicate field key ${key}`);
    seen.add(key);
    const options = CHOICE_TYPES.includes(f.type)
      ? [...new Set((f.options || []).map((o) => String(o).trim()).filter(Boolean))]
      : [];
    if (CHOICE_TYPES.includes(f.type) && options.length === 0) throw new AppError(400, `"${f.label}" needs at least one option`);
    return { key, label: String(f.label).trim(), type: f.type, required: Boolean(f.required), options, placeholder: f.placeholder || '' };
  });
}

// POST /api/forms
exports.createForm = async (req, res) => {
  const form = await Form.create({
    orgId: req.user.orgId,
    createdBy: req.user.id,
    title: req.body.title,
    description: req.body.description || '',
    fields: normaliseFields(req.body.fields),
    slug: nanoid(10), // unguessable public id for the share link
  });
  res.status(201).json({ form });
};

// GET /api/forms
exports.listForms = async (req, res) => {
  const forms = await Form.find({ orgId: req.user.orgId })
    .sort({ updatedAt: -1 })
    .select('title status slug responseCount updatedAt publishedAt');
  res.json({ forms });
};

// GET /api/forms/:id
exports.getForm = async (req, res) => {
  res.json({ form: await findOrgForm(req.user, req.params.id) });
};

// PUT /api/forms/:id
exports.updateForm = async (req, res) => {
  const form = await findOrgForm(req.user, req.params.id);
  if (req.body.title !== undefined) form.title = req.body.title;
  if (req.body.description !== undefined) form.description = req.body.description;
  if (req.body.fields !== undefined) form.fields = normaliseFields(req.body.fields);
  await form.save();
  res.json({ form });
};

// PATCH /api/forms/:id/status   { status: 'published' | 'closed' | 'draft' }
exports.setStatus = async (req, res) => {
  const form = await findOrgForm(req.user, req.params.id);
  const { status } = req.body;
  if (status === 'published' && form.fields.length === 0) throw new AppError(400, 'Add at least one field before publishing');
  form.status = status;
  if (status === 'published' && !form.publishedAt) form.publishedAt = new Date();
  await form.save();
  res.json({ form });
};

// DELETE /api/forms/:id  (owner only) also removes its responses
exports.deleteForm = async (req, res) => {
  const form = await findOrgForm(req.user, req.params.id);
  await Response.deleteMany({ formId: form._id });
  await form.deleteOne();
  res.status(204).end();
};

// GET /api/forms/:id/responses?page=&limit=
exports.listResponses = async (req, res) => {
  const form = await findOrgForm(req.user, req.params.id);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const [items, total] = await Promise.all([
    Response.find({ formId: form._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Response.countDocuments({ formId: form._id }),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
};

// GET /api/forms/:id/analytics
exports.analytics = async (req, res) => {
  const form = await findOrgForm(req.user, req.params.id);
  res.json(await buildAnalytics(form, { days: Number(req.query.days) || 14 }));
};

// GET /api/forms/:id/export.csv
exports.exportCsv = async (req, res) => {
  const form = await findOrgForm(req.user, req.params.id);
  const responses = await Response.find({ formId: form._id }).sort({ createdAt: 1 }).lean();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${form.slug}-responses.csv"`);
  res.send(responsesToCsv(form, responses));
};
