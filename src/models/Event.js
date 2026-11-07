const mongoose = require('mongoose');
const { baseFields, schemaOptions } = require('./_shared');

const eventSchema = new mongoose.Schema(
  {
    ...baseFields,
    title: { type: String, required: true, trim: true, maxlength: 150 },
    type: { type: String, enum: ['exam', 'class', 'event'], default: 'event' },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, default: '', match: /^(([01]\d|2[0-3]):[0-5]\d)?$/ },
    location: { type: String, trim: true, maxlength: 150, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  schemaOptions
);
eventSchema.index({ userId: 1, clientId: 1 }, { unique: true });
eventSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
