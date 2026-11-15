const User = require('../models/User');

// POST /api/users: owner invites an editor or viewer into their organisation
exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ orgId: req.user.orgId, name, email, password, role });
  res.status(201).json({ user: user.toSafeJSON() });
};

// GET /api/users
exports.listUsers = async (req, res) => {
  const users = await User.find({ orgId: req.user.orgId }).sort({ createdAt: 1 });
  res.json({ users: users.map((u) => u.toSafeJSON()) });
};
