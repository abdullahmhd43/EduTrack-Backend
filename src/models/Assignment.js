const mongoose = require('mongoose');
const { baseFields, schemaOptions } = require('./_shared');

const assignmentSchema = new mongoose.Schema(
  {
    ...baseFields,
    courseClientId: { type: String, required: true, index: true }, // references Course.clientId
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    // "Overdue" is derived (dueDate < now && status != completed), never stored.
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
  },
  schemaOptions
);
assignmentSchema.index({ userId: 1, clientId: 1 }, { unique: true });
assignmentSchema.index({ userId: 1, dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
