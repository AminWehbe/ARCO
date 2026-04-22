// Socket.io event handlers — all Battleship real-time logic
const { validateShips, buildBoard, processAttack, emptyShots } = require("./game");
const roomStore = require("./rooms");

const RECONNECT_GRACE_MS = 60_000;

module.exports = function attachSocket(io) {

  // Emit to the opponent of a given player index
  function toOpponent(room, playerIdx, event, data) {
    const opp = room.players[1 - playerIdx];
    if (opp?.socketId) io.to(opp.socketId).emit(event, data);
  }

  // Tear down a room and boot all sockets out
  function closeRoom(room) {
    for (const p of room.players) {
      if (p.disconnectTimer) clearTimeout(p.disconnectTimer);
    }
    roomStore.deleteRoom(room.code);
  }

  io.on("connection", socket => {

    // ── Create room ───────────────────────────────────────────────────────────
    socket.on("create-room", ({ userId, username }) => {
      // Clean up any pre-existing room for this user
      const existing = roomStore.getRoomByUserId(userId);
      if (existing) {
        toOpponent(existing, roomStore.getPlayerIndex(existing, userId), "opponent-disconnected");
        closeRoom(existing);
      }
      const code = roomStore.createRoom(userId, username, socket.id);
      socket.join(code);
      socket.emit("room-created", { roomCode: code });
    });

    // ── Join room ─────────────────────────────────────────────────────────────
    socket.on("join-room", ({ roomCode, userId, username }) => {
      const code = (roomCode || "").toUpperCase().trim();
      const room = roomStore.getRoom(code);
      if (!room)                               return socket.emit("error", { message: "ROOM NOT FOUND" });
      if (room.phase !== "waiting")            return socket.emit("error", { message: "GAME ALREADY STARTED" });
      if (room.players.length >= 2)            return socket.emit("error", { message: "ROOM IS FULL" });
      if (room.players[0].userId === userId)   return socket.emit("error", { message: "CANNOT JOIN YOUR OWN ROOM" });

      room.players.push(roomStore.makePlayer(userId, username, socket.id));
      room.phase = "placement";
      socket.join(code);
      socket.emit("joined", { roomCode: code, opponentUsername: room.players[0].username });
      io.to(room.players[0].socketId).emit("opponent-joined", { username });
    });

    // ── Rejoin room (reconnect) ───────────────────────────────────────────────
    socket.on("rejoin-room", ({ roomCode, userId }) => {
      const room = roomStore.getRoom(roomCode);
      if (!room) return socket.emit("rejoin-failed");

      const idx = roomStore.getPlayerIndex(room, userId);
      if (idx === -1) return socket.emit("rejoin-failed");

      const player = room.players[idx];
      if (player.disconnectTimer) { clearTimeout(player.disconnectTimer); player.disconnectTimer = null; }
      player.socketId = socket.id;
      socket.join(roomCode);

      const opp = room.players[1 - idx];
      socket.emit("rejoined", {
        phase:              room.phase,
        opponentUsername:   opp?.username ?? null,
        yourTurn:           room.phase === "playing" && room.turn === idx,
        shots:              player.shots,       // your shots against opponent
        opponentShots:      opp?.shots ?? null, // opponent's shots on your board
      });
      if (opp?.socketId) io.to(opp.socketId).emit("opponent-reconnected");
    });

    // ── Place ships ───────────────────────────────────────────────────────────
    socket.on("place-ships", ({ roomCode, userId, ships }) => {
      const room = roomStore.getRoom(roomCode);
      if (!room || room.phase !== "placement") return socket.emit("error", { message: "NOT IN PLACEMENT PHASE" });
      if (!validateShips(ships))               return socket.emit("error", { message: "INVALID SHIP PLACEMENT" });

      const idx = roomStore.getPlayerIndex(room, userId);
      if (idx === -1) return;

      room.players[idx].board = buildBoard(ships);
      room.players[idx].shots = emptyShots();
      room.players[idx].ready = true;
      socket.emit("placement-confirmed");

      // Both ready → start the game
      if (room.players.length === 2 && room.players.every(p => p.ready)) {
        room.phase = "playing";
        room.turn  = 0;
        room.players.forEach((p, i) => {
          if (p.socketId) io.to(p.socketId).emit("game-start", { yourTurn: i === 0 });
        });
      }
    });

    // ── Attack ────────────────────────────────────────────────────────────────
    socket.on("attack", ({ roomCode, userId, r, c }) => {
      const room = roomStore.getRoom(roomCode);
      if (!room || room.phase !== "playing") return socket.emit("error", { message: "NOT IN PLAYING PHASE" });

      const attackerIdx = roomStore.getPlayerIndex(room, userId);
      if (attackerIdx !== room.turn)         return socket.emit("error", { message: "NOT YOUR TURN" });

      const defenderIdx = 1 - attackerIdx;
      const result = processAttack(
        room.players[defenderIdx].board,
        room.players[attackerIdx].shots,
        r, c
      );
      if (!result) return socket.emit("error", { message: "INVALID ATTACK" });

      const { hit, sunkShip, gameOver } = result;

      if (gameOver) {
        room.phase = "gameover";
        socket.emit("attack-result",                          { r, c, hit, sunkShip, gameOver: true,  won: true,  isAttacker: true  });
        toOpponent(room, attackerIdx, "attack-result",        { r, c, hit, sunkShip, gameOver: true,  won: false, isAttacker: false });
      } else {
        room.turn = defenderIdx;
        socket.emit("attack-result",                          { r, c, hit, sunkShip, gameOver: false, yourTurn: false, isAttacker: true  });
        toOpponent(room, attackerIdx, "attack-result",        { r, c, hit, sunkShip, gameOver: false, yourTurn: true,  isAttacker: false });
      }
    });

    // ── Rematch ───────────────────────────────────────────────────────────────
    socket.on("rematch", ({ roomCode, userId }) => {
      const room = roomStore.getRoom(roomCode);
      if (!room) return;
      const idx = roomStore.getPlayerIndex(room, userId);
      if (idx === -1) return;

      room.players[idx].wantsRematch = true;
      if (room.players.length === 2 && room.players.every(p => p.wantsRematch)) {
        room.players.forEach(p => { p.board = null; p.shots = null; p.ready = false; p.wantsRematch = false; });
        room.phase = "placement";
        room.turn  = 0;
        io.to(roomCode).emit("rematch-start");
      } else {
        toOpponent(room, idx, "opponent-wants-rematch");
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const room = roomStore.getRoomBySocketId(socket.id);
      if (!room) return;

      const idx = room.players.findIndex(p => p.socketId === socket.id);
      if (idx === -1) return;

      // No grace period needed if game is over or still waiting
      if (room.phase === "gameover" || room.phase === "waiting") {
        closeRoom(room); return;
      }

      // 60s grace period — notify opponent but keep room alive for reconnect
      toOpponent(room, idx, "opponent-disconnected");
      room.players[idx].disconnectTimer = setTimeout(() => {
        closeRoom(room);
      }, RECONNECT_GRACE_MS);
    });
  });
};
