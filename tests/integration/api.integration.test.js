/** Integration tests: need MongoDB (in-memory server or TEST_MONGODB_URI). */
const { app, request, startDb, stopDb, clearDb, registerUser, bearer, courseBody, uuid } = require('../helpers');

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

describe('authentication', () => {
  test('register -> 201, password hashed, token returned', async () => {
    const { res } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const User = require('../../src/models/User');
    const raw = await User.findOne({ email: 'student@example.com' }).select('+passwordHash');
    expect(raw.passwordHash).not.toBe('Passw0rdX');
    expect(raw.passwordHash).toMatch(/^\$2[aby]\$/);
  });
  test('duplicate email -> 409', async () => {
    await registerUser();
    const { res } = await registerUser();
    expect(res.status).toBe(409);
  });
  test('login ok / wrong password 401 / unknown email 401 (same message)', async () => {
    await registerUser();
    const ok = await request(app).post('/api/auth/login').send({ email: 'student@example.com', password: 'Passw0rdX' });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: 'student@example.com', password: 'wrongpass1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.message).toBe(unknown.body.message);
  });
  test('GET /auth/me and profile update', async () => {
    const { token } = await registerUser();
    const me = await request(app).get('/api/auth/me').set(bearer(token));
    expect(me.body.data.email).toBe('student@example.com');
    const up = await request(app).put('/api/users/profile').set(bearer(token)).send({ name: 'New Name', program: 'BSc CS' });
    expect(up.status).toBe(200);
    expect(up.body.data.program).toBe('BSc CS');
  });
});

describe('courses CRUD + ownership', () => {
  test('full CRUD cycle', async () => {
    const { token } = await registerUser();
    const body = courseBody();
    const created = await request(app).post('/api/courses').set(bearer(token)).send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe('CI6330'); // uppercase by schema
    const id = created.body.data.id;
    expect((await request(app).get('/api/courses').set(bearer(token))).body.count).toBe(1);
    expect((await request(app).get(`/api/courses/${id}`).set(bearer(token))).status).toBe(200);
    const upd = await request(app).put(`/api/courses/${id}`).set(bearer(token)).send({ ...body, clientId: undefined, name: 'Renamed' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.name).toBe('Renamed');
    expect((await request(app).delete(`/api/courses/${id}`).set(bearer(token))).status).toBe(200);
    expect((await request(app).get(`/api/courses/${id}`).set(bearer(token))).status).toBe(404);
  });
  test("a user can never read, change or delete another user's data", async () => {
    const a = await registerUser('a@example.com');
    const b = await registerUser('b@example.com');
    const created = await request(app).post('/api/courses').set(bearer(a.token)).send(courseBody());
    const id = created.body.data.id;
    expect((await request(app).get(`/api/courses/${id}`).set(bearer(b.token))).status).toBe(404);
    expect((await request(app).put(`/api/courses/${id}`).set(bearer(b.token)).send({ ...courseBody(), clientId: undefined })).status).toBe(404);
    expect((await request(app).delete(`/api/courses/${id}`).set(bearer(b.token))).status).toBe(404);
    expect((await request(app).get('/api/courses').set(bearer(b.token))).body.count).toBe(0);
  });
  test('missing record -> 404, valid-format unknown id', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/courses/64b0000000000000000000ff').set(bearer(token));
    expect(res.status).toBe(404);
  });
});

describe('sync-oriented behaviour', () => {
  test('POST with same clientId is idempotent (no duplicate)', async () => {
    const { token } = await registerUser();
    const body = courseBody();
    const first = await request(app).post('/api/courses').set(bearer(token)).send(body);
    const second = await request(app).post('/api/courses').set(bearer(token)).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect((await request(app).get('/api/courses').set(bearer(token))).body.count).toBe(1);
  });
  test('stale PUT -> 409 with serverVersion; force:true overrides; identical retry is a no-op', async () => {
    const { token } = await registerUser();
    const body = courseBody();
    const c = (await request(app).post('/api/courses').set(bearer(token)).send(body)).body.data;
    const { clientId, ...fields } = body;
    // another device edits first
    const other = await request(app).put(`/api/courses/${c.id}`).set(bearer(token)).send({ ...fields, name: 'Server edit' });
    expect(other.status).toBe(200);
    // this device edits with the OLD base version
    const stale = await request(app).put(`/api/courses/${c.id}`).set(bearer(token)).send({ ...fields, name: 'My edit', baseUpdatedAt: c.updatedAt });
    expect(stale.status).toBe(409);
    expect(stale.body.serverVersion.name).toBe('Server edit');
    // user chooses "keep mine"
    const forced = await request(app).put(`/api/courses/${c.id}`).set(bearer(token)).send({ ...fields, name: 'My edit', baseUpdatedAt: c.updatedAt, force: true });
    expect(forced.status).toBe(200);
    expect(forced.body.data.name).toBe('My edit');
    // retry of the very same request does not conflict
    const retry = await request(app).put(`/api/courses/${c.id}`).set(bearer(token)).send({ ...fields, name: 'My edit', baseUpdatedAt: c.updatedAt });
    expect(retry.status).toBe(200);
  });
  test('?updatedSince only returns newer records', async () => {
    const { token } = await registerUser();
    await request(app).post('/api/courses').set(bearer(token)).send(courseBody());
    const future = new Date(Date.now() + 60000).toISOString();
    const res = await request(app).get(`/api/courses?updatedSince=${future}`).set(bearer(token));
    expect(res.body.count).toBe(0);
  });
});

describe('assignments, sessions, notes, events', () => {
  test('assignment requires an existing course and supports CRUD', async () => {
    const { token } = await registerUser();
    const course = courseBody();
    const orphan = await request(app).post('/api/assignments').set(bearer(token)).send({
      clientId: uuid(), courseClientId: course.clientId, title: 'HW1', dueDate: '2026-03-01T00:00:00.000Z' });
    expect(orphan.status).toBe(400);
    await request(app).post('/api/courses').set(bearer(token)).send(course);
    const created = await request(app).post('/api/assignments').set(bearer(token)).send({
      clientId: uuid(), courseClientId: course.clientId, title: 'HW1', dueDate: '2026-03-01T00:00:00.000Z', priority: 'high' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('not_started');
    const id = created.body.data.id;
    const upd = await request(app).put(`/api/assignments/${id}`).set(bearer(token)).send({
      courseClientId: course.clientId, title: 'HW1', dueDate: '2026-03-01T00:00:00.000Z', priority: 'high', status: 'completed' });
    expect(upd.body.data.status).toBe('completed');
    expect((await request(app).delete(`/api/assignments/${id}`).set(bearer(token))).status).toBe(200);
  });
  test('deleting a course cascades to its assignments, sessions and notes', async () => {
    const { token } = await registerUser();
    const course = courseBody();
    const created = await request(app).post('/api/courses').set(bearer(token)).send(course);
    await request(app).post('/api/assignments').set(bearer(token)).send({ clientId: uuid(), courseClientId: course.clientId, title: 'A', dueDate: '2026-03-01T00:00:00.000Z' });
    await request(app).post('/api/study-sessions').set(bearer(token)).send({ clientId: uuid(), courseClientId: course.clientId, topic: 'T', date: '2026-03-01', startTime: '09:00', endTime: '10:00' });
    await request(app).post('/api/notes').set(bearer(token)).send({ clientId: uuid(), courseClientId: course.clientId, title: 'N', content: 'c' });
    await request(app).delete(`/api/courses/${created.body.data.id}`).set(bearer(token));
    for (const p of ['assignments', 'study-sessions', 'notes']) {
      expect((await request(app).get(`/api/${p}`).set(bearer(token))).body.count).toBe(0);
    }
  });
  test('notes (optional course) and events CRUD', async () => {
    const { token } = await registerUser();
    const note = await request(app).post('/api/notes').set(bearer(token)).send({ clientId: uuid(), title: 'Free note', content: 'text' });
    expect(note.status).toBe(201);
    const ev = await request(app).post('/api/events').set(bearer(token)).send({ clientId: uuid(), title: 'Final exam', type: 'exam', date: '2026-06-01', startTime: '09:00', location: 'Hall A' });
    expect(ev.status).toBe(201);
    const del = await request(app).delete(`/api/events/${ev.body.data.id}`).set(bearer(token));
    expect(del.status).toBe(200);
  });
});
