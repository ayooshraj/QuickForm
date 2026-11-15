const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { verifyToken } = require('../utils/token');
const Form = require('../models/Form');

let io = null;

const rooms = {
  org: (orgId) => `org:${orgId}`,
  form: (formId) => `form:${formId}`,
};

function initSocket(httpServer, { corsOrigin }) {
  io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } });

  // Same JWT as the REST API authenticates the WebSocket handshake.
  io.use((socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth && socket.handshake.auth.token);
      socket.user = { id: payload.sub, orgId: payload.orgId, role: payload.role };
      return next();
    } catch (err) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(rooms.org(socket.user.orgId));

    // A dashboard asks to watch one form. We check the form belongs to the
    // user's organisation BEFORE joining the room, so tenants can't eavesdrop.
    socket.on('form:watch', async (formId, ack) => {
      const ok = mongoose.isValidObjectId(formId)
        && await Form.exists({ _id: formId, orgId: socket.user.orgId });
      if (ok) socket.join(rooms.form(formId));
      if (typeof ack === 'function') ack({ ok: Boolean(ok) });
    });
    socket.on('form:unwatch', (formId) => socket.leave(rooms.form(formId)));
  });

  return io;
}

function emitTo(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

module.exports = { initSocket, emitTo, rooms };
