'use client'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts'

interface SurfaceData {
  name: string; key: string; total: number; wins: number; rate: number; color: string
}

export function SurfaceChart({ data }: { data: SurfaceData[] }) {
  return (
    <div className="space-y-4">
      {/* Pie chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={80}
              dataKey="total"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={(props: any) => `${props.name} ${props.rate}%`}
              labelLine={false}
            >
              {data.map(d => <Cell key={d.key} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(_value: any, _name: any, props: any) => [
                `${props.payload.wins}勝/${props.payload.total - props.payload.wins}敗 (${props.payload.rate}%)`,
                props.payload.name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar table */}
      <div className="space-y-2.5">
        {data.map(d => (
          <div key={d.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/70 font-medium">{d.name}</span>
              <span className="text-sm font-bold" style={{ color: d.color }}>
                {d.wins}勝{d.total - d.wins}敗 ({d.rate}%)
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${d.rate}%`, background: d.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
