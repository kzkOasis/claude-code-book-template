'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

interface MonthData { month: string; wins: number; losses: number }

export function MonthlyChart({ data }: { data: MonthData[] }) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Legend formatter={v => v === 'wins' ? '勝利' : '敗北'} wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
          <Bar dataKey="wins"   fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="losses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
