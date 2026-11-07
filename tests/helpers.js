process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const request = require('supertest');
const { createApp } = require('../src/app');

let mongod;
/** Uses TEST_MONGODB_URI if provided, otherwise downloads/starts an in-memory MongoDB. */
async function startDb() {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // ensure unique indexes exist
}
async function stopDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}
async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

const app = createApp();
const uuid = () => require('crypto').randomUUID();

async function registerUser(email = 'student@example.com', name = 'Student One') {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'Passw0rdX' });
  return { token: res.body.data.token, user: res.body.data.user, res };
}
const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const courseBody = (over = {}) => ({
  clientId: uuid(), name: 'Mobile App Dev', code: 'ci6330', lecturer: 'Dr. X', description: '',
  startDate: '2026-01-10T00:00:00.000Z', endDate: '2026-05-10T00:00:00.000Z', ...over,
});

module.exports = { app, request, startDb, stopDb, clearDb, registerUser, bearer, courseBody, uuid };
