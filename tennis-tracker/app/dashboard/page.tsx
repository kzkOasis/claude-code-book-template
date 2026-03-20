export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWinRate, getRecentForm, formatDate, formatScore } from '@/lib/utils'
import { WinBadge, SurfaceBadge, MatchTypeBadge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import Link from 'next/link'
import type { Match } from '@/types'
import { TrendingUp, Trophy, Target, Zap } from 'lucide-react'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: matchRows } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', user.id)
    .order('match_date', { ascending: false })
    .limit(50)

  const matches: Match[] = matchRows || []
  const recent = matches.slice(0, 5)
  const winRate = getWinRate(matches)
  const form = getRecentForm(matches, 5)

  const wins = matches.filter(m => m.won).length
  const losses = matches.length - wins

  // 直近月の試合
  const thisMonth = matches.filter(m => {
    const d = new Date(m.match_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <p className="text-white/40 text-sm">おかえりなさい 👋</p>
        <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
          {profile?.display_name || user.email?.split('@')[0]}
        </h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        <StatCard label="通算勝率" value={`${winRate}%`} sub={`${wins}勝 ${losses}敗`} icon={<Trophy size={16} />} color="text-yellow-400" />
        <StatCard label="今月" value={`${thisMonth.length}試合`} sub={`${thisMonth.filter(m=>m.won).length}勝`} icon={<Zap size={16} />} color="text-blue-400" />
        <StatCard label="総試合数" value={`${matches.length}`} sub="シングルス" icon={<Target size={16} />} color="text-emerald-400" />
      </div>

      {/* Recent form */}
      {form.length > 0 && (
        <div className="px-4 mb-5">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                  <TrendingUp size={15} />
                  直近の戦績
                </div>
                <Link href="/stats" className="text-xs text-blue-400">詳細 →</Link>
              </div>
              <div className="flex gap-2">
                {form.map((r, i) => (
                  <div key={i} className={`flex-1 py-2 rounded-lg text-center text-sm font-bold ${
                    r === 'W' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {r}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - form.length) }).map((_, i) => (
                  <div key={`e-${i}`} className="flex-1 py-2 rounded-lg bg-white/5 text-white/20 text-center text-sm">—</div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent matches */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">直近の試合</h2>
          <Link href="/matches" className="text-xs text-blue-400">すべて見る →</Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <div className="text-4xl mb-3">🎾</div>
              <p className="text-white/40 text-sm mb-4">まだ試合が記録されていません</p>
              <Link href="/matches/new"
                className="inline-flex items-center gap-2 bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
                最初の試合を記録する
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {recent.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub: string; icon: React.ReactNode; color: string
}) {
  return (
    <Card>
      <CardBody className="p-3">
        <div className={`flex items-center gap-1 text-xs font-medium mb-1 ${color}`}>
          {icon}{label}
        </div>
        <div className="text-xl font-bold text-white leading-none">{value}</div>
        <div className="text-xs text-white/40 mt-1">{sub}</div>
      </CardBody>
    </Card>
  )
}

function MatchRow({ match }: { match: Match }) {
  return (
    <Link href={`/matches/${match.id}`}>
      <Card className="active:scale-[0.98] transition-transform">
        <CardBody className="flex items-center gap-3 p-3">
          <WinBadge won={match.won} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm truncate">
              vs {match.opponent_name}
            </div>
            <div className="text-xs text-white/40 mt-0.5">
              {formatDate(match.match_date)} · {formatScore(match.sets)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SurfaceBadge surface={match.surface} />
            <MatchTypeBadge type={match.match_type} />
          </div>
        </CardBody>
      </Card>
    </Link>
  )
}
