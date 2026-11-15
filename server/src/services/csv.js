// Minimal RFC-4180 CSV writer (quotes values containing commas, quotes or newlines).
function escape(value) {
  if (value === undefined || value === null) return '';
  const s = Array.isArray(value) ? value.join('; ') : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function responsesToCsv(form, responses) {
  const header = ['Submitted at', ...form.fields.map((f) => f.label)];
  const rows = responses.map((r) => [
    r.createdAt.toISOString(),
    ...form.fields.map((f) => (r.answers || {})[f.key]),
  ]);
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

module.exports = { responsesToCsv };
