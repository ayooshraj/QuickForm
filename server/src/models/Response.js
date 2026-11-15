const mongoose = require('mongoose');

// One submission. `answers` is a flexible object keyed by field.key
// (MongoDB's document model fits this well: every form has a different shape).
const responseSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    answers: { type: mongoose.Schema.Types.Mixed, required: true },
    meta: { userAgent: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The main access pattern: "responses of form X, newest first" + date-range analytics.
responseSchema.index({ formId: 1, createdAt: -1 });
responseSchema.index({ orgId: 1, createdAt: -1 });

module.exports = mongoose.model('Response', responseSchema);
