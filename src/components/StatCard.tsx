export function StatCard({ label, value, colorClass }: { label: string; value: number; colorClass?: string }) {
  return (
    <div className="bg-surface border border-line rounded-xl px-4 py-4">
      <div className="text-[12px] text-text-dim mb-1.5">{label}</div>
      <div className={`font-mono text-[26px] ${colorClass ?? ""}`}>{value}</div>
    </div>
  );
}
