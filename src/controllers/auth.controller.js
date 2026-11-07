const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { env } = require('../config/env');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, studentId, program } = req.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const user = await User.create({ name, email, passwordHash, studentId, program });
  res.status(201).json({ success: true, data: { token: signToken(user._id), user } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password: do not reveal which accounts exist.
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  res.json({ success: true, data: { token: signToken(user._id), user } });
});

exports.me = (req, res) => res.json({ success: true, data: req.user });
