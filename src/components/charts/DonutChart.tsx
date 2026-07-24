export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ segments, size = 170, thickness = 26 }: { segments: DonutSegment[]; size?: number; thickness?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = size / 2 - thickness / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#232B37" strokeWidth={thickness} />
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#5C6672">
          Sin datos
        </text>
      </svg>
    );
  }

  const visible = segments.filter((s) => s.value > 0);
  const circles = visible.map((s, i) => {
      const before = visible.slice(0, i).reduce((sum, x) => sum + x.value, 0);
      const fraction = s.value / total;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const rotation = (before / total) * 360 - 90;
      return (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={thickness}
          strokeDasharray={`${dash.toFixed(1)} ${gap.toFixed(1)}`}
          transform={`rotate(${rotation.toFixed(1)} ${size / 2} ${size / 2})`}
        />
      );
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {circles}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize={24} fontWeight={700} fill="#EDEFF2">
        {total}
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize={10} fill="#97A1AE">
        jugada{total === 1 ? "" : "s"}
      </text>
    </svg>
  );
}

export function ChartLegend({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  if (visible.length === 0) {
    return <p className="text-[12.5px] text-text-faint m-0">Sin jugadas evaluadas todavía.</p>;
  }
  return (
    <>
      {visible.map((s, i) => {
        const pct = total ? Math.round((s.value / total) * 100) : 0;
        return (
          <div key={i} className="flex items-center gap-2 text-[12.5px] mb-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="text-text-dim">
              {s.value} · {pct}%
            </span>
          </div>
        );
      })}
    </>
  );
}
