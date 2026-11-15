const mongoose = require('mongoose');
const Response = require('../models/Response');
const { CHOICE_TYPES } = require('../models/Form');

// Builds the dashboard numbers with MongoDB aggregation pipelines, so the
// database does the counting instead of loading every response into Node.
async function buildAnalytics(form, { days = 14 } = {}) {
  const formId = new mongoose.Types.ObjectId(form._id);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // 1) Total + responses per day (for the trend chart)
  const [total, perDay] = await Promise.all([
    Response.countDocuments({ formId }),
    Response.aggregate([
      { $match: { formId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // 2) Per-field breakdown
  const fields = [];
  for (const field of form.fields) {
    const path = `$answers.${field.key}`;
    if (CHOICE_TYPES.includes(field.type)) {
      // Option counts. $unwind makes checkbox arrays count each ticked option once.
      const rows = await Response.aggregate([
        { $match: { formId, [`answers.${field.key}`]: { $exists: true } } },
        { $project: { v: path } },
        { $unwind: '$v' },
        { $group: { _id: '$v', count: { $sum: 1 } } },
      ]);
      const counts = Object.fromEntries(field.options.map((o) => [o, 0]));
      rows.forEach((r) => { counts[r._id] = r.count; });
      fields.push({ key: field.key, label: field.label, type: field.type, counts });
    } else if (field.type === 'rating' || field.type === 'number') {
      const [row] = await Response.aggregate([
        { $match: { formId, [`answers.${field.key}`]: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: path }, min: { $min: path }, max: { $max: path }, answered: { $sum: 1 } } },
      ]);
      fields.push({
        key: field.key, label: field.label, type: field.type,
        avg: row ? Math.round(row.avg * 100) / 100 : null, min: row ? row.min : null, max: row ? row.max : null,
        answered: row ? row.answered : 0,
      });
    } else {
      const answered = await Response.countDocuments({ formId, [`answers.${field.key}`]: { $exists: true } });
      fields.push({ key: field.key, label: field.label, type: field.type, answered });
    }
  }

  return { total, perDay: perDay.map((d) => ({ date: d._id, count: d.count })), fields };
}

module.exports = { buildAnalytics };
