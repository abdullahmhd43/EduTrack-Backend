const { env, assertEnv } = require('./config/env');
const { connectDb } = require('./config/db');
const { createApp } = require('./app');

(async () => {
  try {
    assertEnv();
    await connectDb();
    console.log('MongoDB connected');
    createApp().listen(env.port, '0.0.0.0', () => console.log(`EduTrack API listening on port ${env.port}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
