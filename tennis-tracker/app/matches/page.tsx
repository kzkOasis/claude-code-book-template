export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Match } from '@/types'
import { formatDate, formatScore } from '@/lib/utils'
import { WinBadge, SurfaceBadge, MatchTypeBadge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: matchRows } = await supabase
    .from('matches').select('*').eq('user_id', user.id)
    .order('match_date', { ascending: false })

  const matches: Match[] = matchRows || []

  // Group by month
  const groups: Record<string, Match[]> = {}
  for (const m of matches) {
    const key = m.match_date.slice(0, 7)
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5">
          <ChevronLeft size={20} className="text-white" />
        </Link>
        <h1 className="text-lg font-bold text-white">試合一覧 ({matches.length})</h1>
      </div>

      {matches.length === 0 ? (
        <div className="px-4 text-center py-16 text-white/40">まだ試合が記録されていません</div>
      ) : (
        <div className="px-4 space-y-6">
          {Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])).map(([month, ms]) => (
            <div key={month}>
              <div className="text-xs font-semibold text-white/30 uppercase mb-2 px-1">
                {month.replace('-', '年')}月 · {ms.length}試合
              </div>
              <div className="space-y-2">
                {ms.map(m => (
                  <Link key={m.id} href={`/matches/${m.id}`}>
                    <Card className="active:scale-[0.98] transition-transform">
                      <CardBody className="flex items-center gap-3 p-3">
                        <WinBadge won={m.won} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">vs {m.opponent_name}</div>
                          <div className="text-xs text-white/40 mt-0.5">
                            {formatDate(m.match_date)} · {formatScore(m.sets)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <SurfaceBadge surface={m.surface} />
                          <MatchTypeBadge type={m.match_type} />
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
