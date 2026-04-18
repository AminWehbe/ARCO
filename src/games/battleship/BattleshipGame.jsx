import { useState } from "react";
import { useKeyNav } from "../../hooks/useKeyNav";

// WS_WIRE: import { connectRoom, emitFire, emitShipsPlaced, onGameState, onGameOver } from "../../api/socket.js"
// WS_WIRE: Socket events to implement on EC2 Express:
//   Client → Server: "ships_placed" { playerId, board }
//   Client → Server: "fire"         { playerId, row, col }
//   Server → Client: "game_state"   { shots, lastHit, turn }
//   Server → Client: "game_over"    { winner }

const ROWS = 10;
const COLS = 10;
const CELL = 34;
const LETTERS = ["A","B","C","D","E","F","G","H","I","J"];

const SHIPS = [
  { name: "CARRIER",    size: 5 },
  { name: "BATTLESHIP", size: 4 },
  { name: "CRUISER",    size: 3 },
  { name: "SUBMARINE",  size: 3 },
  { name: "DESTROYER",  size: 2 },
];

// ── Board helpers ─────────────────────────────────────────────────────────────

function emptyBoard() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ ship: null }))
  );
}

function emptyShots() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ fired: false, hit: false }))
  );
}

function canPlace(board, row, col, size, dir) {
  for (let i = 0; i < size; i++) {
    const r = dir === "H" ? row     : row + i;
    const c = dir === "H" ? col + i : col;
    if (r >= ROWS || c >= COLS || board[r][c].ship) return false;
  }
  return true;
}

function doPlace(board, row, col, size, dir, name) {
  const b = board.map(r => r.map(c => ({ ...c })));
  for (let i = 0; i < size; i++) {
    const r = dir === "H" ? row     : row + i;
    const c = dir === "H" ? col + i : col;
    b[r][c] = { ship: name };
  }
  return b;
}

function allSunk(board, shots) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c].ship && !shots[r][c].hit) return false;
  return true;
}

function shipsRemaining(board, shots) {
  return SHIPS.filter(s =>
    Array.from({ length: ROWS }).some((_, r) =>
      Array.from({ length: COLS }).some((_, c) =>
        board[r][c].ship === s.name && !shots[r][c].hit
      )
    )
  ).length;
}

// ── Grid component ────────────────────────────────────────────────────────────
// mode "place"  → shows placed ships + hover preview, clickable
// mode "own"    → your ships + incoming enemy shots (read-only)
// mode "enemy"  → fog of war, only reveals fired shots, clickable

function Grid({ board, shots = emptyShots(), mode, hoverCells, onCellClick, onCellHover }) {
  return (
    <div style={{ display: "inline-block", userSelect: "none" }}>
      {/* Column numbers */}
      <div style={{ display: "flex", paddingLeft: CELL }}>
        {Array.from({ length: COLS }, (_, c) => (
          <div key={c} style={{ width: CELL, textAlign: "center", fontFamily: "'Press Start 2P'", fontSize: 7, color: "var(--phos-dim)", paddingBottom: 4 }}>
            {c + 1}
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: ROWS }, (_, r) => (
        <div key={r} style={{ display: "flex" }}>
          {/* Row letter */}
          <div style={{ width: CELL, display: "grid", placeItems: "center", fontFamily: "'Press Start 2P'", fontSize: 7, color: "var(--phos-dim)" }}>
            {LETTERS[r]}
          </div>
          {/* Cells */}
          {Array.from({ length: COLS }, (_, c) => {
            const cell   = board[r][c];
            const shot   = shots[r][c];
            const hover  = hoverCells?.find(h => h.r === r && h.c === c);
            const valid  = hoverCells?.[0]?.valid;

            let bg      = "#08080e";
            let border  = `1px solid var(--phos-dim)`;
            let cursor  = "default";
            let content = null;

            if (mode === "place") {
              if (cell.ship)  { bg = "rgba(78,245,154,0.25)"; border = "1px solid var(--phos)"; }
              if (hover)      { bg = valid ? "rgba(78,245,154,0.55)" : "rgba(255,59,107,0.45)"; border = valid ? "1px solid var(--phos)" : "1px solid var(--pink)"; cursor = "pointer"; }
              else if (!cell.ship) cursor = "crosshair";
            }

            if (mode === "own") {
              if (cell.ship) { bg = "rgba(78,245,154,0.15)"; border = "1px solid var(--phos)"; }
              if (shot.fired) content = shot.hit
                ? <span style={{ color: "#ff3b6b", fontSize: 16, lineHeight: 1 }}>✕</span>
                : <span style={{ color: "var(--phos-dim)", fontSize: 28, lineHeight: 1 }}>●</span>;
            }

            if (mode === "enemy") {
              if (!shot.fired) cursor = "crosshair";
              if (shot.fired) {
                content = shot.hit
                  ? <span style={{ color: "#ff3b6b", fontSize: 16, lineHeight: 1 }}>✕</span>
                  : <span style={{ color: "var(--phos-dim)", fontSize: 28, lineHeight: 1 }}>●</span>;
                if (shot.hit) { bg = "rgba(255,59,107,0.18)"; border = "1px solid var(--pink)"; }
              }
            }

            return (
              <div
                key={c}
                style={{ width: CELL, height: CELL, background: bg, border, display: "grid", placeItems: "center", cursor, boxSizing: "border-box", transition: "background 0.08s" }}
                onMouseEnter={() => onCellHover?.(r, c)}
                onMouseLeave={() => onCellHover?.(null, null)}
                onClick={() => onCellClick?.(r, c)}
              >
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main game component ───────────────────────────────────────────────────────

// Props:
//   onGameOver(winnerPlayerNum) — AWS_WIRE: hook up submitScore in InGame.jsx
export default function BattleshipGame({ onGameOver }) {
  const [phase,       setPhase]       = useState("place"); // place | handoff | battle | gameover
  const [turn,        setTurn]        = useState(1);
  const [boards,      setBoards]      = useState({ 1: emptyBoard(), 2: emptyBoard() });
  const [shots,       setShots]       = useState({ 1: emptyShots(), 2: emptyShots() });
  const [shipIdx,     setShipIdx]     = useState(0);
  const [dir,         setDir]         = useState("H");
  const [hover,       setHover]       = useState(null);
  const [handoffMsg,  setHandoffMsg]  = useState("");
  const [handoffNext, setHandoffNext] = useState(null);
  const [winner,      setWinner]      = useState(null);
  const [lastResult,  setLastResult]  = useState(null); // "HIT" | "MISS" | "SUNK"

  const opponent    = turn === 1 ? 2 : 1;
  const currentShip = SHIPS[shipIdx];

  // R to rotate during placement, Enter to continue from handoff
  useKeyNav(e => {
    if ((e.key === "r" || e.key === "R") && phase === "place") {
      setDir(d => d === "H" ? "V" : "H");
    }
    if (e.key === "Enter" && phase === "handoff") {
      e.preventDefault();
      handoffNext?.();
    }
  }, [phase, handoffNext]);

  // Hover preview cells during placement
  let hoverCells = null;
  if (phase === "place" && hover && currentShip) {
    const valid = canPlace(boards[turn], hover.r, hover.c, currentShip.size, dir);
    hoverCells = Array.from({ length: currentShip.size }, (_, i) => ({
      r: dir === "H" ? hover.r : hover.r + i,
      c: dir === "H" ? hover.c + i : hover.c,
      valid,
    })).filter(h => h.r < ROWS && h.c < COLS);
  }

  function goHandoff(msg, next) {
    setHandoffMsg(msg);
    setHandoffNext(() => next);
    setPhase("handoff");
  }

  function handlePlaceClick(r, c) {
    if (!currentShip || !canPlace(boards[turn], r, c, currentShip.size, dir)) return;
    const newBoard  = doPlace(boards[turn], r, c, currentShip.size, dir, currentShip.name);
    const newBoards = { ...boards, [turn]: newBoard };
    setBoards(newBoards);

    if (shipIdx + 1 < SHIPS.length) {
      setShipIdx(shipIdx + 1);
    } else {
      // WS_WIRE: emitShipsPlaced({ playerId: turn, board: newBoard })
      if (turn === 1) {
        goHandoff("P1 FLEET DEPLOYED — PASS TO PLAYER 2", () => {
          setTurn(2); setShipIdx(0); setDir("H"); setHover(null); setPhase("place");
        });
      } else {
        goHandoff("ALL FLEETS DEPLOYED — PLAYER 1 FIRES FIRST", () => {
          setTurn(1); setPhase("battle");
        });
      }
    }
  }

  function handleFireClick(r, c) {
    if (shots[turn][r][c].fired) return;

    const hit = !!boards[opponent][r][c].ship;
    const newShots = {
      ...shots,
      [turn]: shots[turn].map((row, ri) =>
        row.map((cell, ci) => ri === r && ci === c ? { fired: true, hit } : cell)
      ),
    };
    setShots(newShots);

    // WS_WIRE: emitFire({ playerId: turn, row: r, col: c })
    // WS_WIRE: Server responds with "game_state" — replace local logic below with onGameState handler

    if (allSunk(boards[opponent], newShots[turn])) {
      setWinner(turn);
      setPhase("gameover");
      onGameOver?.(turn);
      // WS_WIRE: onGameOver handler fires here instead
      return;
    }

    const result = hit ? "💥 HIT!" : "MISS";
    setLastResult(result);
    goHandoff(`${result} — PASS TO PLAYER ${opponent}`, () => {
      setTurn(opponent); setLastResult(null); setPhase("battle");
    });
  }

  function reset() {
    setPhase("place"); setTurn(1);
    setBoards({ 1: emptyBoard(), 2: emptyBoard() });
    setShots({ 1: emptyShots(), 2: emptyShots() });
    setShipIdx(0); setDir("H"); setHover(null); setWinner(null); setLastResult(null);
  }

  // ── Screens ───────────────────────────────────────────────────────────────

  if (phase === "handoff") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, minHeight: 400 }}>
      <div className="pixel" style={{ fontSize: 9, color: "var(--pink)", letterSpacing: "0.12em" }}>⚠ COVER THE SCREEN — PASS DEVICE ⚠</div>
      <div className="pixel-title" style={{ fontSize: 14, textAlign: "center", maxWidth: 500, lineHeight: 2 }}>{handoffMsg}</div>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={handoffNext}>READY →</button>
      <div className="muted pixel" style={{ fontSize: 8 }}>or press ENTER</div>
    </div>
  );

  if (phase === "gameover") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 400 }}>
      <div className="pixel-title" style={{ fontSize: 28 }}>PLAYER {winner} WINS</div>
      <div className="muted" style={{ fontSize: 16 }}>all enemy ships have been sunk</div>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={reset}>PLAY AGAIN</button>
    </div>
  );

  if (phase === "place") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "8px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div className="pixel" style={{ fontSize: 10, color: "#fff" }}>PLAYER {turn} — PLACE YOUR FLEET</div>
        {currentShip && <>
          <span className="pill pink">{currentShip.name} · SIZE {currentShip.size}</span>
          <button className="btn ghost" style={{ padding: "4px 10px" }} onClick={() => setDir(d => d === "H" ? "V" : "H")}>
            [{dir}] &nbsp;<span style={{ fontSize: 8 }}>R = ROTATE</span>
          </button>
        </>}
      </div>
      {/* Grid */}
      <Grid
        board={boards[turn]}
        mode="place"
        hoverCells={hoverCells}
        onCellClick={handlePlaceClick}
        onCellHover={(r, c) => setHover(r !== null ? { r, c } : null)}
      />
      {/* Ship checklist */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {SHIPS.map((s, i) => (
          <span key={s.name} className={`pill${i < shipIdx ? " accent" : i === shipIdx ? " pink" : ""}`}>
            {i < shipIdx ? "✓ " : ""}{s.name}
          </span>
        ))}
      </div>
      <div className="muted pixel" style={{ fontSize: 8 }}>CLICK TO PLACE · R TO ROTATE</div>
    </div>
  );

  if (phase === "battle") {
    const myShots    = shots[turn];
    const enemyShots = shots[opponent];

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "8px 0" }}>
        {/* Turn + stats */}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div className="pixel" style={{ fontSize: 10, color: "#fff" }}>PLAYER {turn} — FIRE!</div>
          <span className="pill warn">{shipsRemaining(boards[opponent], myShots)} enemy ships left</span>
          <span className="pill">{shipsRemaining(boards[turn], enemyShots)} your ships left</span>
        </div>
        {/* Boards */}
        <div style={{ display: "flex", gap: 36, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="label">YOUR FLEET</div>
            <Grid board={boards[turn]} shots={enemyShots} mode="own" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="label">ENEMY WATERS — CLICK TO FIRE</div>
            <Grid board={boards[opponent]} shots={myShots} mode="enemy" onCellClick={handleFireClick} />
          </div>
        </div>
        <div className="muted pixel" style={{ fontSize: 8 }}>CLICK ENEMY WATERS TO FIRE</div>
      </div>
    );
  }

  return null;
}
