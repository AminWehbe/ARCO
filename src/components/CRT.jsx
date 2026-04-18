// Reusable CRT monitor frame — wraps any screen content
export default function CRT({ children }) {
  return (
    <div className="crt">
      <div className="inner">{children}</div>
    </div>
  );
}
