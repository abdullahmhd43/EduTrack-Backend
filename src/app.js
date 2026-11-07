const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { env } = require('./config/env');
const resources = require('./resources');
const resourceRoutes = require('./routes/resource.routes');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  if (!env.isTest) app.use(morgan('dev'));

  // Lightweight reachability probe used by the Flutter app (internet != server reachable).
  app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/user.routes'));
  resources.forEach((r) => app.use(`/api/${r.path}`, resourceRoutes(r)));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
