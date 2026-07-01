import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

// Generate a persistent token so the server can re-identify this player after reconnect
function getOrCreateToken() {
  let token = localStorage.getItem('flip7_token');
  if (!token) {
    token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem('flip7_token', token);
  }
  return token;
}

export const playerToken = getOrCreateToken();

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 3000,
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling'],
  auth: {
    token: getOrCreateToken(),
  },
});