// Section label shown above each CRT frame
export default function ScreenHead({ num, title, note }) {
  return (
    <div className="screen-head">
      <h2>{num} · {title}</h2>
      <p>{note}</p>
    </div>
  );
}
