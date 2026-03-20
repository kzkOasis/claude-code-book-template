'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea, Label } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { calcWinner } from '@/lib/utils'
import type { Surface, MatchType, SetScore } from '@/types'
import { ChevronLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

const SURFACE_OPTIONS: { value: Surface; label: string; color: string }[] = [
  { value: 'omni',    label: 'オムニ',     color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' },
  { value: 'hard',    label: 'ハード',     color: 'bg-blue-500/20 border-blue-500/40 text-blue-400' },
  { value: 'clay',    label: 'クレー',     color: 'bg-orange-500/20 border-orange-500/40 text-orange-400' },
  { value: 'carpet',  label: 'カーペット', color: 'bg-purple-500/20 border-purple-500/40 text-purple-400' },
  { value: 'grass',   label: 'グラス',     color: 'bg-teal-500/20 border-teal-500/40 text-teal-400' },
]

const emptySet = (): SetScore => ({ mine: 0, opponent: 0 })

export default function NewMatchPage() {
  const router = useRouter()
  const supabase = createClient()

  // Basic fields
  const [opponent, setOpponent] = useState('')
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])
  const [surface, setSurface]   = useState<Surface>('omni')
  const [matchType, setType]    = useState<MatchType>('tournament')
  const [tournament, setTournament] = useState('')

  // Score
  const [sets, setSets] = useState<SetScore[]>([emptySet(), emptySet()])
  const [showThirdSet, setShowThirdSet] = useState(false)

  // Stats
  const [showStats, setShowStats]   = useState(false)
  const [aces, setAces]             = useState('')
  const [df, setDf]                 = useState('')
  const [ue, setUe]                 = useState('')
  const [winners, setWinners]       = useState('')
  const [notes, setNotes]           = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function updateSet(idx: number, field: keyof SetScore, val: string) {
    const n = parseInt(val) || 0
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: n } : s))
  }

  function toggleThirdSet(v: boolean) {
    setShowThirdSet(v)
    if (v && sets.length < 3) setSets(prev => [...prev, emptySet()])
    if (!v) setSets(prev => prev.slice(0, 2))
  }

  const activeSets = showThirdSet ? sets : sets.slice(0, 2)
  const won = calcWinner(activeSets)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!opponent.trim()) { setError('対戦相手名を入力してください'); return }

    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('ログインが必要です')

      const payload = {
        user_id:        user.id,
        opponent_name:  opponent.trim(),
        match_date:     date,
        tournament_name: tournament.trim() || null,
        match_type:     matchType,
        surface,
        sets:           activeSets,
        won,
        aces:           aces ? parseInt(aces) : null,
        double_faults:  df ? parseInt(df) : null,
        unforced_errors: ue ? parseInt(ue) : null,
        winners:        winners ? parseInt(winners) : null,
        notes:          notes.trim() || null,
      }

      const { error } = await supabase.from('matches').insert(payload)
      if (error) throw error

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10">
          <ChevronLeft size={20} className="text-white" />
        </Link>
        <h1 className="text-lg font-bold text-white">試合を記録</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-4">
        {/* 相手・日付 */}
        <Card>
          <CardBody className="space-y-4">
            <div>
              <Label>対戦相手</Label>
              <Input value={opponent} onChange={e => setOpponent(e.target.value)}
                placeholder="山田 太郎" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>試合日</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div>
                <Label>種別</Label>
                <Select value={matchType} onChange={e => setType(e.target.value as MatchType)}>
                  <option value="tournament">大会</option>
                  <option value="practice">練習試合</option>
                  <option value="league">リーグ</option>
                </Select>
              </div>
            </div>
            {matchType !== 'practice' && (
              <div>
                <Label>大会名</Label>
                <Input value={tournament} onChange={e => setTournament(e.target.value)}
                  placeholder="例: 〇〇テニス選手権" />
              </div>
            )}
          </CardBody>
        </Card>

        {/* サーフェス */}
        <Card>
          <CardBody>
            <Label className="mb-2">サーフェス</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {SURFACE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSurface(opt.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    surface === opt.value ? opt.color : 'bg-white/5 border-white/10 text-white/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* スコア入力 */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <Label className="mb-0">スコア</Label>
              {/* 勝敗プレビュー */}
              <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {won ? '勝利 🏆' : '敗北'}
              </span>
            </div>

            {/* ヘッダー */}
            <div className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] gap-2 mb-2 text-xs text-white/40 font-medium px-1">
              <div>セット</div>
              <div className="text-center">自分</div>
              <div className="text-center">相手</div>
              <div className="text-center">TB</div>
            </div>

            <div className="space-y-2">
              {activeSets.map((s, i) => {
                const isTb = s.mine === 6 && s.opponent === 6
                return (
                  <div key={i} className="grid grid-cols-[1fr_3.5rem_3.5rem_3.5rem] gap-2 items-center">
                    <div className="text-sm font-medium text-white/60">第{i + 1}セット</div>
                    <ScoreInput value={s.mine} onChange={v => updateSet(i, 'mine', v)} />
                    <ScoreInput value={s.opponent} onChange={v => updateSet(i, 'opponent', v)} />
                    <div>
                      {isTb ? (
                        <TbInput
                          mine={s.tiebreak_mine ?? ''}
                          opp={s.tiebreak_opponent ?? ''}
                          onMine={v => updateSet(i, 'tiebreak_mine', v)}
                          onOpp={v => updateSet(i, 'tiebreak_opponent', v)}
                        />
                      ) : (
                        <div className="h-11 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/20 text-xs">
                          —
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 第3セット追加 */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => toggleThirdSet(!showThirdSet)}
                className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${
                  showThirdSet
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                {showThirdSet ? <><X size={14} />第3セットを削除</> : <><Plus size={14} />第3セットを追加</>}
              </button>
            </div>
          </CardBody>
        </Card>

        {/* 詳細統計（オプション） */}
        <button
          type="button"
          onClick={() => setShowStats(!showStats)}
          className="w-full py-3 text-sm font-medium text-blue-400 border border-blue-500/20 bg-blue-500/5 rounded-xl hover:bg-blue-500/10 transition-colors"
        >
          {showStats ? '▲ 詳細統計を閉じる' : '▼ 詳細統計を追加（任意）'}
        </button>

        {showStats && (
          <Card>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>エース数</Label>
                  <Input type="number" min="0" value={aces} onChange={e => setAces(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>ダブルフォルト</Label>
                  <Input type="number" min="0" value={df} onChange={e => setDf(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>ウィナー数</Label>
                  <Input type="number" min="0" value={winners} onChange={e => setWinners(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Label>UE（凡ミス）</Label>
                  <Input type="number" min="0" value={ue} onChange={e => setUe(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <Label>メモ（相手の特徴・反省点）</Label>
                <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="例: バックハンドが弱い。サーブは左に集めると効果的。" />
              </div>
            </CardBody>
          </Card>
        )}

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? '保存中...' : '試合結果を保存'}
        </Button>
      </form>
    </div>
  )
}

function ScoreInput({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={() => onChange(String(value + 1))}
        className="w-full h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white text-lg font-bold leading-none">
        +
      </button>
      <div className="text-xl font-bold text-white w-full text-center">{value}</div>
      <button type="button" onClick={() => onChange(String(Math.max(0, value - 1)))}
        className="w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-lg font-bold leading-none">
        −
      </button>
    </div>
  )
}

function TbInput({ mine, opp, onMine, onOpp }: {
  mine: number | string; opp: number | string
  onMine: (v: string) => void; onOpp: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1 h-full justify-center">
      <input type="number" min="0" value={mine} onChange={e => onMine(e.target.value)}
        placeholder="自"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500" />
      <input type="number" min="0" value={opp} onChange={e => onOpp(e.target.value)}
        placeholder="相"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white text-center focus:outline-none focus:border-blue-500" />
    </div>
  )
}
