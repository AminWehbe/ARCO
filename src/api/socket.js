// Socket.io-client singleton — one connection shared across the app
import { io } from "socket.io-client";

const BASE = import.meta.env.VITE_API_BASE_URL;
let _socket = null;

// Get or create the socket (does not auto-connect)
export function getSocket() {
  if (!_socket) {
    _socket = io(BASE, {
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return _socket;
}

// Disconnect and destroy — call on component unmount
export function destroySocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

// Persist session for reconnect
export function saveSession(roomCode, userId) {
  localStorage.setItem("arco_bs_session", JSON.stringify({ roomCode, userId }));
}

export function loadSession() {
  try { return JSON.parse(localStorage.getItem("arco_bs_session")); }
  catch { return null; }
}

export function clearSession() {
  localStorage.removeItem("arco_bs_session");
}
