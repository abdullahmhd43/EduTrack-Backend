
const { env, assertEnv } = require('./config/env');
const { connectDb } = require('./config/db');
const { createApp } = require('./app');

const app = createApp();

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`EduTrack API listening on port ${env.port}`);
});

async function startDatabase() {
  try {
    assertEnv();
    await connectDb();
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

startDatabase();

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
