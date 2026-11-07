const { z } = require('zod');

const str = (max, { min = 0 } = {}) => z.string().trim().min(min).max(max);
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Must be a valid ISO date');
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be yyyy-MM-dd');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be HH:mm');
const clientId = z.string().trim().min(8).max(64);

// Extra properties only meaningful on update (optimistic concurrency + explicit override).
const updateExtras = { baseUpdatedAt: isoDate.optional(), force: z.boolean().optional() };

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const registerSchema = z.object({
  name: str(80, { min: 2 }),
  email: z.string().trim().toLowerCase().email().max(120),
  password,
  studentId: str(30).optional(),
  program: str(100).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const profileSchema = z.object({
  name: str(80, { min: 2 }),
  studentId: str(30).optional(),
  program: str(100).optional(),
});

const courseShape = {
  name: str(100, { min: 1 }),
  code: str(20, { min: 1 }),
  lecturer: str(100).optional().default(''),
  description: str(1000).optional().default(''),
  startDate: isoDate,
  endDate: isoDate,
};
const courseCheck = [(d) => Date.parse(d.endDate) >= Date.parse(d.startDate), { message: 'End date must not be before start date', path: ['endDate'] }];

const assignmentShape = {
  courseClientId: clientId,
  title: str(150, { min: 1 }),
  description: str(2000).optional().default(''),
  dueDate: isoDate,
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
};

const timeOrder = [(d) => d.endTime > d.startTime, { message: 'End time must be after start time', path: ['endTime'] }];
const studyShape = {
  courseClientId: clientId,
  topic: str(150, { min: 1 }),
  date: ymd,
  startTime: hhmm,
  endTime: hhmm,
  description: str(1000).optional().default(''),
  completed: z.boolean().optional().default(false),
};

const noteShape = {
  courseClientId: clientId.nullable().optional().default(null),
  title: str(150, { min: 1 }),
  content: str(20000, { min: 1 }),
};

const eventShape = {
  title: str(150, { min: 1 }),
  type: z.enum(['exam', 'class', 'event']).default('event'),
  date: ymd,
  startTime: hhmm,
  endTime: z.union([hhmm, z.literal('')]).optional().default(''),
  location: str(150).optional().default(''),
  description: str(1000).optional().default(''),
};
const eventCheck = [(d) => !d.endTime || d.endTime > d.startTime, { message: 'End time must be after start time', path: ['endTime'] }];

/** Build { create, update } zod schemas for a resource. */
function build(shape, check) {
  const make = (extra) => {
    const obj = z.object({ ...shape, ...extra }).strict();
    return check ? obj.refine(...check) : obj;
  };
  return { create: make({ clientId }), update: make(updateExtras) };
}

module.exports = {
  registerSchema,
  loginSchema,
  profileSchema,
  course: build(courseShape, courseCheck),
  assignment: build(assignmentShape),
  studySession: build(studyShape, timeOrder),
  note: build(noteShape),
  event: build(eventShape, eventCheck),
};
