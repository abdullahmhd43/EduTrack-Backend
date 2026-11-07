/**
 * Unit tests: run WITHOUT a database (User model is mocked).
 * They cover authentication guards, request validation and error responses.
 */
process.env.NODE_ENV = 'test';
jest.mock('../../src/models/User');
const request = require('supertest');
const User = require('../../src/models/User');
const { createApp } = require('../../src/app');
const { signToken } = require('../../src/utils/token');

const app = createApp();
const fakeUser = { _id: '64b000000000000000000001', name: 'Test' };
const authHeader = () => ({ Authorization: `Bearer ${signToken(fakeUser._id)}` });

beforeEach(() => {
  User.findById.mockResolvedValue(fakeUser);
  User.exists.mockResolvedValue(null);
});

describe('health & routing', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
  test('unknown route returns JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
  test('malformed JSON returns 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});

describe('auth guard on protected routes', () => {
  const protectedRoutes = ['/api/courses', '/api/assignments', '/api/study-sessions', '/api/notes', '/api/events', '/api/users/profile', '/api/auth/me'];
  test.each(protectedRoutes)('GET %s without token -> 401', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });
  test('invalid token -> 401', async () => {
    const res = await request(app).get('/api/courses').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });
  test('valid token but deleted user -> 401', async () => {
    User.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/courses').set(authHeader());
    expect(res.status).toBe(401);
  });
});

describe('request validation', () => {
  test('register with weak password / bad email -> 400 with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'nope', password: '123' });
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });
  test('login with missing fields -> 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
  test('course with end date before start date -> 400', async () => {
    const res = await request(app).post('/api/courses').set(authHeader()).send({
      clientId: '11111111-2222-3333-4444-555555555555', name: 'Maths', code: 'MA101',
      startDate: '2026-05-01T00:00:00.000Z', endDate: '2026-01-01T00:00:00.000Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('endDate');
  });
  test('study session with end before start -> 400', async () => {
    const res = await request(app).post('/api/study-sessions').set(authHeader()).send({
      clientId: '11111111-2222-3333-4444-555555555555', courseClientId: '11111111-2222-3333-4444-666666666666',
      topic: 'Revision', date: '2026-05-01', startTime: '10:00', endTime: '09:00',
    });
    expect(res.status).toBe(400);
  });
  test('assignment with invalid priority -> 400', async () => {
    const res = await request(app).post('/api/assignments').set(authHeader()).send({
      clientId: '11111111-2222-3333-4444-555555555555', courseClientId: '11111111-2222-3333-4444-666666666666',
      title: 'HW', dueDate: '2026-05-01T00:00:00.000Z', priority: 'urgent',
    });
    expect(res.status).toBe(400);
  });
  test('unknown extra fields are rejected (strict schema)', async () => {
    const res = await request(app).post('/api/events').set(authHeader()).send({
      clientId: '11111111-2222-3333-4444-555555555555', title: 'Exam', date: '2026-05-01', startTime: '09:00', userId: 'hacker',
    });
    expect(res.status).toBe(400);
  });
  test('invalid ObjectId in path -> 400', async () => {
    const res = await request(app).get('/api/courses/not-an-id').set(authHeader());
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid id/i);
  });
});
