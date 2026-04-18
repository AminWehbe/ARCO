import { useApp } from "../context/AppContext";

// Floating tweaks panel — opened via postMessage from parent frame (wireframe editor compat)
export default function TweaksPanel({ open, onClose }) {
  const { tweaks, setTweaks } = useApp();

  return (
    <div id="tweaks-panel" className={open ? "open" : ""}>
      <header>
        <h4>TWEAKS</h4>
        <span className="kbd" style={{ cursor: "pointer" }} onClick={onClose}>X</span>
      </header>
      <div className="body">
        <label>Phosphor color
          <input type="color" value={tweaks.accent} onChange={e => setTweaks({ accent: e.target.value })} />
        </label>
        <label>Pink accent
          <input type="color" value={tweaks.pink} onChange={e => setTweaks({ pink: e.target.value })} />
        </label>
        <label>Scanlines
          <select value={tweaks.scan} onChange={e => setTweaks({ scan: e.target.value })}>
            <option value="on">on</option>
            <option value="off">off</option>
          </select>
        </label>
        <label>Fifth game slot
          <select value={tweaks.g5} onChange={e => setTweaks({ g5: e.target.value })}>
            <option value="PONG">Pong</option>
            <option value="BREAKOUT">Breakout</option>
            <option value="TETRIS">Tetris-ish</option>
            <option value="ASTEROIDS">Asteroids</option>
          </select>
        </label>
      </div>
    </div>
  );
}
