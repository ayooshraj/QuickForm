const http = require('http');
const env = require('./config/env');
const { connectDB } = require('./config/db');
const createApp = require('./app');
const { initSocket } = require('./socket');

async function start() {
  await connectDB(env.mongoUri);
  const app = createApp();
  // Express and Socket.IO share ONE HTTP server (one port for REST + WebSockets).
  const server = http.createServer(app);
  initSocket(server, { corsOrigin: env.clientOrigin });
  server.listen(env.port, () => console.log(`QuickForm API listening on :${env.port}`));

  // Graceful shutdown: stop accepting connections, then close the DB (important in Docker).
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => require('mongoose').connection.close(false).then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
