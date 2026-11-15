const mongoose = require('mongoose');

// A tenant: one company/team using QuickForm. Everything else is scoped by orgId.
const organizationSchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true } },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
