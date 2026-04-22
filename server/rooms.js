// In-memory room store — rooms are ephemeral, lost on server restart
const rooms = new Map();

// Generate a random 4-char code (no I/O to avoid confusion)
function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function makePlayer(userId, username, socketId) {
  return { userId, username, socketId, board: null, shots: null, ready: false, wantsRematch: false, disconnectTimer: null };
}

// Create a new room, return its code
function createRoom(userId, username, socketId) {
  const code = genCode();
  rooms.set(code, {
    code,
    phase: "waiting", // waiting | placement | playing | gameover
    players: [makePlayer(userId, username, socketId)],
    turn: 0,
  });
  return code;
}

function getRoom(code) { return rooms.get(code) ?? null; }
function deleteRoom(code) { rooms.delete(code); }
function getAllRooms() { return rooms.values(); }
function getPlayerIndex(room, userId) { return room.players.findIndex(p => p.userId === userId); }
function getRoomByUserId(userId) {
  for (const room of rooms.values())
    if (room.players.some(p => p.userId === userId)) return room;
  return null;
}
function getRoomBySocketId(socketId) {
  for (const room of rooms.values())
    if (room.players.some(p => p.socketId === socketId)) return room;
  return null;
}

module.exports = { createRoom, getRoom, deleteRoom, getAllRooms, getPlayerIndex, getRoomByUserId, getRoomBySocketId, makePlayer };
