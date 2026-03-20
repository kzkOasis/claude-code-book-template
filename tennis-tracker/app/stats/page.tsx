import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Match, Surface } from '@/types'
import { SURFACE_LABELS, SURFACE_COLORS } from '@/types'
import { getWinRate } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { SurfaceChart } from '@/components/stats/surface-chart'
import { OpponentTable } from '@/components/stats/opponent-table'
import { MonthlyChart } from '@/components/stats/monthly-chart'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: matchRows } = await supabase
    .from('matches').select('*').eq('user_id', user.id)
    .order('match_date', { ascending: false })

  const matches: Match[] = matchRows || []

  if (matches.length === 0) {
    return (
      <div className="px-4 pt-8 text-center">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-white/40">試合を記録すると分析が表示されます</p>
      </div>
    )
  }

  // Surface stats
  const surfaces = ['omni', 'hard', 'clay', 'carpet', 'grass'] as Surface[]
  const surfaceData = surfaces
    .map(s => {
      const ms = matches.filter(m => m.surface === s)
      if (!ms.length) return null
      return {
        name:  SURFACE_LABELS[s],
        key:   s,
        total: ms.length,
        wins:  ms.filter(m => m.won).length,
        rate:  getWinRate(ms),
        color: SURFACE_COLORS[s],
      }
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof mapSurface>>[]

  function mapSurface(s: Surface) {
    const ms = matches.filter(m => m.surface === s)
    if (!ms.length) return null
    return {
      name: SURFACE_LABELS[s], key: s, total: ms.length,
      wins: ms.filter(m => m.won).length, rate: getWinRate(ms), color: SURFACE_COLORS[s],
    }
  }

  // Opponent stats
  const opponentMap: Record<string, { wins: number; losses: number }> = {}
  for (const m of matches) {
    const k = m.opponent_name
    if (!opponentMap[k]) opponentMap[k] = { wins: 0, losses: 0 }
    if (m.won) opponentMap[k].wins++
    else opponentMap[k].losses++
  }

  const opponentData = Object.entries(opponentMap)
    .map(([name, { wins, losses }]) => ({
      name, wins, losses, total: wins + losses,
      rate: Math.round((wins / (wins + losses)) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Monthly stats (last 6 months)
  const monthlyData = getMonthlyData(matches)

  // Stats totals
  const totalAces = matches.reduce((s, m) => s + (m.aces || 0), 0)
  const totalDf   = matches.reduce((s, m) => s + (m.double_faults || 0), 0)
  const totalUe   = matches.reduce((s, m) => s + (m.unforced_errors || 0), 0)
  const hasStats  = totalAces + totalDf + totalUe > 0

  return (
    <div className="pb-24 px-4">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">分析</h1>
        <p className="text-white/40 text-sm mt-1">全{matches.length}試合のデータ</p>
      </div>

      {/* Overall */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <OverallCard label="勝率" value={`${getWinRate(matches)}%`} />
        <OverallCard label="勝利" value={`${matches.filter(m=>m.won).length}`} color="text-emerald-400" />
        <OverallCard label="敗北" value={`${matches.filter(m=>!m.won).length}`} color="text-red-400" />
      </div>

      {/* Surface chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-white/80">サーフェス別勝率</h2>
        </CardHeader>
        <CardBody>
          <SurfaceChart data={surfaceData} />
        </CardBody>
      </Card>

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white/80">月別試合数・勝敗</h2>
          </CardHeader>
          <CardBody>
            <MonthlyChart data={monthlyData} />
          </CardBody>
        </Card>
      )}

      {/* Opponent analytics */}
      {opponentData.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white/80">対戦相手別</h2>
          </CardHeader>
          <CardBody className="p-0">
            <OpponentTable data={opponentData} />
          </CardBody>
        </Card>
      )}

      {/* Shot stats */}
      {hasStats && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-sm font-semibold text-white/80">ショット統計（累計）</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-3 text-center">
              <StatBlock label="エース" value={totalAces} color="text-blue-400" />
              <StatBlock label="DF" value={totalDf} color="text-red-400" />
              <StatBlock label="凡ミス" value={totalUe} color="text-orange-400" />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function OverallCard({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <Card>
      <CardBody className="p-3 text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-white/40 mt-1">{label}</div>
      </CardBody>
    </Card>
  )
}

function StatBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  )
}

function getMonthlyData(matches: Match[]) {
  const map: Record<string, { wins: number; losses: number }> = {}
  for (const m of matches) {
    const key = m.match_date.slice(0, 7) // YYYY-MM
    if (!map[key]) map[key] = { wins: 0, losses: 0 }
    if (m.won) map[key].wins++
    else map[key].losses++
  }
  return Object.entries(map)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, { wins, losses }]) => ({
      month: month.replace('-', '/'),
      wins, losses,
    }))
}
