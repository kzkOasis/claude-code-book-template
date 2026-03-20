interface OpponentData {
  name: string; wins: number; losses: number; total: number; rate: number
}

export function OpponentTable({ data }: { data: OpponentData[] }) {
  return (
    <div className="divide-y divide-white/5">
      {data.map(d => {
        const isCamo   = d.rate >= 70 && d.total >= 2
        const isTeneki = d.rate <= 30 && d.total >= 2
        return (
          <div key={d.name} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white truncate">{d.name}</span>
                {isCamo   && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold shrink-0">得意</span>}
                {isTeneki && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold shrink-0">苦手</span>}
              </div>
              <div className="text-xs text-white/40 mt-0.5">{d.total}試合</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: d.rate >= 50 ? '#22c55e' : '#ef4444' }}>
                {d.rate}%
              </div>
              <div className="text-xs text-white/40">{d.wins}W {d.losses}L</div>
            </div>
            <div className="w-16">
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${d.rate}%`,
                  background: d.rate >= 50 ? '#22c55e' : '#ef4444',
                }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
