const mongoose = require('mongoose');
const { baseFields, schemaOptions } = require('./_shared');

const studySessionSchema = new mongoose.Schema(
  {
    ...baseFields,
    courseClientId: { type: String, required: true, index: true },
    topic: { type: String, required: true, trim: true, maxlength: 150 },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // yyyy-MM-dd
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // HH:mm
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    completed: { type: Boolean, default: false },
  },
  schemaOptions
);
studySessionSchema.index({ userId: 1, clientId: 1 }, { unique: true });
studySessionSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
