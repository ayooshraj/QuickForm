const mongoose = require('mongoose');

const FIELD_TYPES = ['text', 'textarea', 'email', 'number', 'select', 'radio', 'checkbox', 'rating', 'date', 'file'];
const CHOICE_TYPES = ['select', 'radio', 'checkbox'];

// The form's structure is stored as data (a list of field definitions).
// The same definition drives the builder UI, the public form, server-side validation and analytics.
const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },          // stable id used in answers, e.g. "f_ab12"
    label: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: FIELD_TYPES, required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],         // only for select / radio / checkbox
    placeholder: { type: String, default: '' },
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', maxlength: 2000 },
    fields: { type: [fieldSchema], default: [] },
    // draft -> published (public link works) -> closed (link shows "no longer accepting responses")
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft' },
    // Public, unguessable identifier used in the share link: /f/<slug>
    slug: { type: String, required: true, unique: true },
    responseCount: { type: Number, default: 0 }, // denormalised counter for fast list views
    publishedAt: Date,
  },
  { timestamps: true }
);

formSchema.index({ orgId: 1, updatedAt: -1 });

module.exports = mongoose.model('Form', formSchema);
module.exports.FIELD_TYPES = FIELD_TYPES;
module.exports.CHOICE_TYPES = CHOICE_TYPES;
