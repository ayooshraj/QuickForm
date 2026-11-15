// Server-side validation of a submission against the form definition.
// Never trust the browser: the public endpoint is open to anyone, so every answer
// is checked for type, required-ness and allowed options, and unknown keys are dropped.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLOUDINARY_RE = /^https:\/\/res\.cloudinary\.com\//;

function isEmpty(v) {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

function validateAnswers(form, rawAnswers = {}) {
  const errors = {};
  const clean = {};

  for (const field of form.fields) {
    const value = rawAnswers[field.key];

    if (isEmpty(value)) {
      if (field.required) errors[field.key] = `${field.label} is required`;
      continue;
    }

    switch (field.type) {
      case 'text':
      case 'textarea': {
        if (typeof value !== 'string') { errors[field.key] = 'Must be text'; break; }
        const max = field.type === 'text' ? 500 : 5000;
        if (value.length > max) { errors[field.key] = `Must be under ${max} characters`; break; }
        clean[field.key] = value.trim();
        break;
      }
      case 'email':
        if (typeof value !== 'string' || !EMAIL_RE.test(value)) errors[field.key] = 'Must be a valid email';
        else clean[field.key] = value.trim().toLowerCase();
        break;
      case 'number': {
        const n = Number(value);
        if (!Number.isFinite(n)) errors[field.key] = 'Must be a number';
        else clean[field.key] = n;
        break;
      }
      case 'rating': {
        const r = Number(value);
        if (!Number.isInteger(r) || r < 1 || r > 5) errors[field.key] = 'Rating must be 1-5';
        else clean[field.key] = r;
        break;
      }
      case 'date':
        if (Number.isNaN(Date.parse(value))) errors[field.key] = 'Must be a valid date';
        else clean[field.key] = String(value);
        break;
      case 'select':
      case 'radio':
        if (!field.options.includes(value)) errors[field.key] = 'Invalid option';
        else clean[field.key] = value;
        break;
      case 'checkbox': {
        const arr = Array.isArray(value) ? value : [value];
        if (!arr.every((v) => field.options.includes(v))) errors[field.key] = 'Invalid option';
        else clean[field.key] = [...new Set(arr)];
        break;
      }
      case 'file':
        // Files go browser -> Cloudinary directly; we only store the resulting URL,
        // and only accept URLs that really point at Cloudinary.
        if (typeof value !== 'string' || !CLOUDINARY_RE.test(value)) errors[field.key] = 'Invalid file upload';
        else clean[field.key] = value;
        break;
      default:
        break;
    }
  }

  return { clean, errors, valid: Object.keys(errors).length === 0 };
}

module.exports = { validateAnswers };
