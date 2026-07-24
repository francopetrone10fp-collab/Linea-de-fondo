export interface BarItem {
  label: string;
  count: number;
}

export function BarsChart({ items, barColor = "#C79A3D" }: { items: BarItem[]; barColor?: string }) {
  if (items.length === 0) return <p className="text-[12.5px] text-text-faint m-0">Sin datos.</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <>
      {items.map((i, idx) => (
        <div key={idx} className="flex items-center gap-2.5 mb-2">
          <div className="w-[150px] flex-none text-[12px] text-text-dim truncate">{i.label}</div>
          <div className="flex-1 bg-surface-2 rounded-[5px] h-3.5 overflow-hidden">
            <div className="h-full rounded-[5px]" style={{ width: `${(i.count / max) * 100}%`, background: barColor }} />
          </div>
          <div className="w-6 text-right font-mono text-[12px] text-text-dim">{i.count}</div>
        </div>
      ))}
    </>
  );
}
