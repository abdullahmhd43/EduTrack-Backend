const mongoose = require('mongoose');
const { baseFields, schemaOptions } = require('./_shared');

const courseSchema = new mongoose.Schema(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
    lecturer: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  schemaOptions
);
courseSchema.index({ userId: 1, clientId: 1 }, { unique: true }); // idempotent sync + duplicate prevention
courseSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
