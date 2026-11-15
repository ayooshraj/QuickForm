const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// owner:  everything, incl. managing the team
// editor: create/edit/publish forms and see responses
// viewer: read forms and analytics only (no raw responses)
const ROLES = ['owner', 'editor', 'viewer'];

const userSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Globally unique: one QuickForm account belongs to exactly one organisation.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'viewer' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return { id: this._id, orgId: this.orgId, name: this.name, email: this.email, role: this.role };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
