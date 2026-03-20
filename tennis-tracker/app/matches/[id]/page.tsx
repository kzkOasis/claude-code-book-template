import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Match } from '@/types'
import { SURFACE_LABELS, MATCH_TYPE_LABELS } from '@/types'
import { formatDate, formatScore } from '@/lib/utils'
import { WinBadge, SurfaceBadge, MatchTypeBadge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { DeleteMatchButton } from '@/components/matches/delete-button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data } = await supabase.from('matches').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!data) notFound()
  const match = data as Match

  const hasStats = match.aces || match.double_faults || match.unforced_errors || match.winners

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/matches" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5">
            <ChevronLeft size={20} className="text-white" />
          </Link>
          <h1 className="text-lg font-bold text-white">試合詳細</h1>
        </div>
        <DeleteMatchButton id={match.id} />
      </div>

      <div className="px-4 space-y-4">
        {/* Result */}
        <Card>
          <CardBody className="text-center py-6">
            <WinBadge won={match.won} />
            <div className="text-3xl font-bold text-white mt-3">
              vs {match.opponent_name}
            </div>
            <div className="text-2xl font-mono text-blue-400 mt-2 tracking-wider">
              {formatScore(match.sets)}
            </div>
            <p className="text-white/40 text-sm mt-2">{formatDate(match.match_date)}</p>
          </CardBody>
        </Card>

        {/* Details */}
        <Card>
          <CardBody className="divide-y divide-white/5">
            <DetailRow label="サーフェス" value={<SurfaceBadge surface={match.surface} />} />
            <DetailRow label="種別" value={<MatchTypeBadge type={match.match_type} />} />
            {match.tournament_name && <DetailRow label="大会名" value={match.tournament_name} />}
          </CardBody>
        </Card>

        {/* Set by set */}
        <Card>
          <CardBody>
            <h3 className="text-sm font-semibold text-white/60 mb-3">セット詳細</h3>
            <div className="space-y-2">
              {match.sets.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white/50">第{i + 1}セット</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${s.mine > s.opponent ? 'text-white' : 'text-white/30'}`}>
                      {s.mine}
                    </span>
                    <span className="text-white/20">—</span>
                    <span className={`text-lg font-bold ${s.opponent > s.mine ? 'text-white' : 'text-white/30'}`}>
                      {s.opponent}
                    </span>
                    {s.tiebreak_mine !== undefined && (
                      <span className="text-xs text-white/40">
                        TB({s.tiebreak_mine}-{s.tiebreak_opponent})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Stats */}
        {hasStats && (
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-white/60 mb-3">ショット統計</h3>
              <div className="grid grid-cols-2 gap-3">
                {match.aces !== null && <StatChip label="エース" value={match.aces} color="text-blue-400" />}
                {match.double_faults !== null && <StatChip label="ダブルフォルト" value={match.double_faults} color="text-red-400" />}
                {match.winners !== null && <StatChip label="ウィナー" value={match.winners} color="text-emerald-400" />}
                {match.unforced_errors !== null && <StatChip label="凡ミス(UE)" value={match.unforced_errors} color="text-orange-400" />}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Notes */}
        {match.notes && (
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-white/60 mb-2">メモ</h3>
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{match.notes}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-white/40">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value ?? '—'}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  )
}
