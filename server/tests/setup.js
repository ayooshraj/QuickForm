const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const createApp = require('../src/app');
const { initSocket } = require('../src/socket');

// Spins up an in-memory MongoDB + a real HTTP/Socket.IO server on a random port.
async function startTestServer() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server, { corsOrigin: '*' });
  await new Promise((resolve) => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;
  return {
    app, server, url,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}

module.exports = { startTestServer };
