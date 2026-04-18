import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import Cabinet from "../components/Cabinet";
import ScreenHead from "../components/ScreenHead";

// Grid is 3 columns: positions 0-4 are games, position 5 is the empty "SOON" slot
//   [0] [1] [2]
//   [3] [4] [5=empty]

const BASE_GAMES = [
  { name: "SNAKE",   tag: "1P",   hi: null }, // hi filled dynamically from localStorage
  { name: "FLAPPY",  tag: "1P",   hi: "214" },
  { name: "MEMORY",  tag: "1P",   hi: "00:42" },
  { name: "TIC-TAC", tag: "2P",   hi: "12-3" },
];
const COLS = 3;
const VALID = 5; // indices 0-4 are valid games

export default function Library() {
  const { tweaks, navigate, launchGame } = useApp();
  const [selected, setSelected] = useState(0);
  const [snakeHi, setSnakeHi] = useState(() => parseInt(localStorage.getItem("arco_snake_hi") || "0"));

  // Refresh snake hi-score each time Library mounts (e.g. returning from InGame)
  useEffect(() => {
    setSnakeHi(parseInt(localStorage.getItem("arco_snake_hi") || "0"));
  }, []);

  const games = [
    { ...BASE_GAMES[0], hi: snakeHi > 0 ? snakeHi.toLocaleString() : "---" },
    ...BASE_GAMES.slice(1),
    { name: tweaks.g5, tag: "2P", hi: "21-14" },
  ];
  const current = games[selected];

  function move(delta) {
    setSelected(s => {
      let next = s + delta;
      // Skip the empty slot (index 5)
      if (next < 0) next = VALID - 1;
      if (next >= VALID) next = 0;
      return next;
    });
  }

  function moveRow(delta) {
    setSelected(s => {
      const next = s + delta * COLS;
      if (next < 0 || next >= VALID) return s; // no wrap on vertical edges
      return next;
    });
  }

  useKeyNav(e => {
    if (e.key === "ArrowLeft")  { e.preventDefault(); move(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    if (e.key === "ArrowUp")    { e.preventDefault(); moveRow(-1); }
    if (e.key === "ArrowDown")  { e.preventDefault(); moveRow(1); }
    if (e.key === "Enter")      { e.preventDefault(); launchGame(games[selected].name); }
    if (e.key === "Escape")     { e.preventDefault(); navigate("landing"); }
  }, [selected]);

  return (
    <>
      <ScreenHead num="02" title="Library" note="the hall — walk up to any cabinet" />
      <CRT>
        <Bezel title="THE HALL" right={<span className="muted" style={{ fontSize: 14 }}>5 of 6 cabinets</span>} />

        <div className="pixel-title" style={{ fontSize: 20, textAlign: "center", margin: "8px 0 18px" }}>
          SELECT A GAME
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 40, padding: "20px 40px", justifyItems: "center", flex: 1, alignContent: "center" }}>
          {games.map((g, i) => (
            <Cabinet
              key={g.name}
              {...g}
              selected={selected === i}
              onClick={() => { setSelected(i); launchGame(games[i].name); }}
            />
          ))}
          <Cabinet empty />
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          <div className="pixel phos" style={{ fontSize: 11 }}>
            ▸ {current.name}  ·  {current.tag} PLAYERS  ·  HI {current.hi}
          </div>
          <div className="row">
            <span className="kbd">← →</span><span className="muted">move</span>
            <span className="kbd">↑ ↓</span><span className="muted">row</span>
            <span className="kbd">ENTER</span><span className="muted">insert coin</span>
            <span className="kbd">ESC</span><span className="muted">back</span>
          </div>
        </div>
      </CRT>
    </>
  );
}
