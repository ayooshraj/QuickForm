const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // behind Render's proxy: lets rate limiting see real client IPs
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '200kb' }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', require('./routes/auth.routes'));
  app.use('/api/users', require('./routes/user.routes'));
  app.use('/api/forms', require('./routes/form.routes'));
  app.use('/api/public', require('./routes/public.routes'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
