const mongoose = require('mongoose');
const { baseFields, schemaOptions } = require('./_shared');

const noteSchema = new mongoose.Schema(
  {
    ...baseFields,
    courseClientId: { type: String, default: null, index: true }, // optional link to a course
    title: { type: String, required: true, trim: true, maxlength: 150 },
    content: { type: String, required: true, trim: true, maxlength: 20000 },
  },
  schemaOptions
);
noteSchema.index({ userId: 1, clientId: 1 }, { unique: true });
noteSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
