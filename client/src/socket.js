import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL || undefined;

// One authenticated socket per logged-in session; the server joins it to the right rooms.
export function connectSocket(token) {
  return io(BASE, { auth: { token } });
}
