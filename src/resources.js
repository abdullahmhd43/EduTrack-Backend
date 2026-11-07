// Declarative description of every user-owned resource. One generic controller serves all of them.
const Course = require('./models/Course');
const Assignment = require('./models/Assignment');
const StudySession = require('./models/StudySession');
const Note = require('./models/Note');
const Event = require('./models/Event');
const schemas = require('./validators/schemas');

module.exports = [
  {
    path: 'courses', Model: Course, schema: schemas.course,
    fields: ['name', 'code', 'lecturer', 'description', 'startDate', 'endDate'],
    // deleting a course removes everything that references it (mirrors ON DELETE CASCADE in SQLite)
    cascade: [Assignment, StudySession, Note],
  },
  {
    path: 'assignments', Model: Assignment, schema: schemas.assignment,
    fields: ['courseClientId', 'title', 'description', 'dueDate', 'priority', 'status'],
    requiresCourse: true,
  },
  {
    path: 'study-sessions', Model: StudySession, schema: schemas.studySession,
    fields: ['courseClientId', 'topic', 'date', 'startTime', 'endTime', 'description', 'completed'],
    requiresCourse: true,
  },
  {
    path: 'notes', Model: Note, schema: schemas.note,
    fields: ['courseClientId', 'title', 'content'],
    optionalCourse: true,
  },
  {
    path: 'events', Model: Event, schema: schemas.event,
    fields: ['title', 'type', 'date', 'startTime', 'endTime', 'location', 'description'],
  },
];
