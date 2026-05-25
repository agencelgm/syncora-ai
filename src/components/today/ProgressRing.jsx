export default function ProgressRing({ total, done }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none"
          stroke="hsl(var(--gold))" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
        {pct}%
      </span>
    </div>
  );
}