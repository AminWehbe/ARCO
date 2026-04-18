import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useKeyNav } from "../hooks/useKeyNav";
import { fetchUserStats } from "../api/client";
import CRT from "../components/CRT";
import Bezel from "../components/Bezel";
import ScreenHead from "../components/ScreenHead";

// AWS_WIRE: fetchUserStats() calls GET /users/{userId}/stats → DynamoDB

const MOCK_STATS = {
  hours: "12.4", games: "147", wins: "62", streak: "5 DAYS",
  perGame: [
    ["SNAKE",   "8,420", "#14", 0.72],
    ["FLAPPY",  "214",   "#07", 0.88],
    ["MEMORY",  "00:42", "#03", 0.95],
    ["TIC-TAC", "12-3",  "#22", 0.55],
  ],
};

export default function Profile() {
  const { user, tweaks, signOut, navigate } = useApp();
  const [stats, setStats] = useState(MOCK_STATS);

  useKeyNav(e => {
    if (e.key === "Escape") { e.preventDefault(); navigate("library"); }
  }, []);

  const displayName = user?.displayName ?? "PIXELWYRM";
  const userId      = user?.userId     ?? "u_9f32a1";

  useEffect(() => {
    if (!user || user.isGuest) return;
    fetchUserStats(userId)
      .then(data => { if (data) setStats(data); })
      .catch(() => { /* keep mock */ });
  }, [userId]);

  const perGame = [
    ...stats.perGame,
    [tweaks.g5, "—", "#—", 0],
  ];

  return (
    <>
      <ScreenHead num="05" title="Profile" note="your stats across all games" />
      <CRT>
        <Bezel title={`/profile/${displayName.toLowerCase()}`} right={<span className="muted" style={{ fontSize: 14 }}>member since APR 2026</span>} />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 30, flex: 1 }}>
          {/* Left: identity + stats */}
          <div className="col">
            <div className="row">
              <div style={{ width: 72, height: 72, background: "var(--phos)", color: "#000", display: "grid", placeItems: "center", fontFamily: "'Press Start 2P'", fontSize: 24, boxShadow: "5px 5px 0 var(--pink)" }}>
                {displayName.slice(0, 2)}
              </div>
              <div className="col">
                <div className="pixel" style={{ fontSize: 18, color: "#fff" }}>{displayName}</div>
                <div className="muted" style={{ fontSize: 14 }}>@{displayName.toLowerCase()} · id {userId}</div>
                <div style={{ marginTop: 4 }}>
                  <span className="pill accent">LVL 07</span>&nbsp;
                  <span className="pill">BRONZE</span>
                </div>
              </div>
            </div>

            <div style={{ fontFamily: "'VT323'", fontSize: 17, marginTop: 10 }}>
              <div className="pixel phos" style={{ fontSize: 10, marginBottom: 8 }}>&gt; /stats</div>
              <div className="bright">HOURS....... {stats.hours}</div>
              <div className="bright">GAMES....... {stats.games}</div>
              <div className="bright">WINS........ {stats.wins}</div>
              <div className="bright">STREAK...... {stats.streak}</div>
              <div className="pink" style={{ marginTop: 8 }}>▌</div>
            </div>
          </div>

          {/* Right: per-game bests */}
          <div className="col">
            <div className="label">PER-GAME BEST</div>
            {perGame.map(([g, s, r, p]) => (
              <div key={g} style={{ display: "grid", gridTemplateColumns: "80px 60px 1fr 70px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "2px dashed var(--phos-dim)" }}>
                <div className="pixel bright" style={{ fontSize: 10 }}>{g}</div>
                <div className="pixel" style={{ fontSize: 10, color: "var(--phos)" }}>{r}</div>
                <div className="bar"><span style={{ width: `${p * 100}%` }} /></div>
                <div className="pixel" style={{ fontSize: 9, textAlign: "right" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px dashed var(--phos-dim)", paddingTop: 12 }}>
          <span className="muted pixel" style={{ fontSize: 8 }}>scores synced via dynamodb</span>
          <div className="row">
            <button className="btn ghost">EDIT</button>
            <button className="btn" onClick={signOut}>SIGN OUT</button>
          </div>
        </div>
      </CRT>
    </>
  );
}
