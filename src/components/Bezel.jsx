// Top bar inside the CRT frame — title left, status right
export default function Bezel({ title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px dashed var(--phos-dim)", paddingBottom: 10 }}>
      <div className="pixel" style={{ color: "var(--phos)", fontSize: 10 }}>{title}</div>
      {right ?? <span className="pill accent">● ONLINE</span>}
    </div>
  );
}
