const Organization = require('../models/Organization');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/token');

// POST /api/auth/register: creates a new organisation and makes the caller its owner.
exports.register = async (req, res) => {
  const { orgName, name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError(409, 'Email already registered');
  const org = await Organization.create({ name: orgName });
  try {
    const user = await User.create({ orgId: org._id, name, email, password, role: 'owner' });
    res.status(201).json({ token: signToken(user), user: user.toSafeJSON(), org: { id: org._id, name: org.name } });
  } catch (err) {
    await Organization.deleteOne({ _id: org._id }); // don't leave an orphan tenant behind
    throw err;
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new AppError(401, 'Invalid credentials');
  const org = await Organization.findById(user.orgId);
  res.json({ token: signToken(user), user: user.toSafeJSON(), org: { id: org._id, name: org.name } });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, orgId: req.user.orgId });
  if (!user) throw new AppError(404, 'User not found');
  res.json({ user: user.toSafeJSON() });
};
