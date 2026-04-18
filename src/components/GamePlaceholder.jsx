// Drop-zone stub for games not yet implemented
// To wire a real game: create src/games/{slug}/index.jsx and import it here
export default function GamePlaceholder({ name }) {
  return (
    <div style={{
      flex: 1,
      minHeight: 340,
      background: "repeating-linear-gradient(45deg, #08080e 0 12px, #0d0d18 12px 24px)",
      border: "2px dashed var(--phos-dim)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      color: "var(--phos-dim)",
    }}>
      <div className="pixel" style={{ fontSize: 14, color: "var(--phos)" }}>{name}</div>
      <div className="pixel" style={{ fontSize: 8, textAlign: "center", lineHeight: 2 }}>
        GAME NOT YET IMPLEMENTED<br />
        create src/games/{name.toLowerCase()}/index.jsx<br />
        and import it in InGame.jsx
      </div>
      <div style={{ fontSize: 14 }}>[ placeholder ]</div>
    </div>
  );
}
