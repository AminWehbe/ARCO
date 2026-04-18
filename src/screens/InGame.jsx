import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";
import SnakeGame   from "../games/snake/SnakeGame";
import MemoryGame  from "../games/memory/MemoryGame";
import GamePlaceholder from "../components/GamePlaceholder";

// AWS_WIRE: replace console.log with submitScore(activeGame, score) from api/client.js

const GAME_META = {
  SNAKE:   { label: "SNAKE · 1P",  players: "1P" },
  MEMORY:  { label: "MEMORY · 1P", players: "1P" },
  FLAPPY:  { label: "FLAPPY · 1P", players: "1P" },
  "TIC-TAC": { label: "TIC-TAC · 2P", players: "2P" },
};

function GameSwitch({ name, onGameOver }) {
  if (name === "SNAKE")  return <SnakeGame  onGameOver={onGameOver} />;
  if (name === "MEMORY") return <MemoryGame onGameOver={onGameOver} />;
  return <GamePlaceholder name={name} />;
}

export default function InGame() {
  const { user, navigate, activeGame } = useApp();
  const playerName = user?.displayName ?? "GUEST_42";
  const [lastScore, setLastScore] = useState(null);
  const meta = GAME_META[activeGame] ?? { label: activeGame + " · 1P", players: "1P" };

  useKeyNav(e => {
    if (e.key === "Escape" || e.key === "q" || e.key === "Q") {
      e.preventDefault(); navigate("library");
    }
  }, []);

  function handleGameOver(score) {
    setLastScore(score);
    console.log(`[${activeGame}] game over, score:`, score);
    // AWS_WIRE: submitScore(activeGame, score)
  }

  return (
    <>
      <ScreenHead num="03" title="In-game" note={meta.label.toLowerCase()} />
      <CRT>
        <Bezel title={meta.label} right={<span className="pill accent">● PLAYING</span>} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
          <div className="col">
            <div className="label">PLAYER</div>
            <div className="pixel" style={{ fontSize: 14, color: "#fff" }}>{playerName}</div>
          </div>
          {lastScore !== null && (
            <div className="col" style={{ alignItems: "center" }}>
              <div className="label">LAST SCORE</div>
              <div className="stat phos">{String(lastScore).padStart(5, "0")}</div>
            </div>
          )}
          <div className="col" style={{ alignItems: "flex-end" }}>
            <div className="label">CONTROLS</div>
            <div className="row" style={{ gap: 4 }}>
              {activeGame === "SNAKE"
                ? <><span className="kbd">↑↓←→</span><span className="muted">move</span></>
                : <><span className="kbd">CLICK</span><span className="muted">flip</span></>
              }
              <span className="kbd">Q</span><span className="muted">quit</span>
            </div>
          </div>
        </div>

        <GameSwitch name={activeGame} onGameOver={handleGameOver} />
      </CRT>
    </>
  );
}
