// Ruled-line bar chart used for option counts. The longest bar is drawn in full ink.
export default function Bars({ counts }) {
  const entries = Object.entries(counts);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="bars">
      {entries.map(([label, n]) => (
        <div key={label} className={`bar-row${n === max && n > 0 ? ' top' : ''}`}>
          <span className="label" title={label}>{label}</span>
          <div className="bar-track"><div className="bar" style={{ width: `${(n / max) * 100}%` }} /></div>
          <b>{n}</b>
        </div>
      ))}
    </div>
  );
}
