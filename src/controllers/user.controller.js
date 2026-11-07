const asyncHandler = require('../utils/asyncHandler');

exports.getProfile = (req, res) => res.json({ success: true, data: req.user });

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, studentId, program } = req.body;
  req.user.name = name;
  if (studentId !== undefined) req.user.studentId = studentId;
  if (program !== undefined) req.user.program = program;
  await req.user.save();
  res.json({ success: true, data: req.user });
});
