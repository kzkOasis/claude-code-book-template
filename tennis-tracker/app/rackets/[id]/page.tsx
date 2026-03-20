/**
 * Racket Lab — ラケット詳細ページ
 *
 * /rackets/[id] で表示される高級テニスショップ風のページ。
 * - レーダーチャート (Recharts)
 * - ガット × テンション AI アドバイス (Server Action)
 * - アフィリエイトリンク
 */
'use client'

import { useState, useTransition } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  ShoppingCart,
  Star,
  Zap,
  Target,
  Shield,
  Heart,
  Clock,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type StringType = 'poly' | 'nylon' | 'natural_gut' | 'hybrid' | 'multifilament'

interface RacketDetail {
  id: string
  brand: string
  modelName: string
  imageUrl?: string
  specs: {
    weight_g: number
    balance_mm: number
    face_size_sq_inch: number
    string_pattern: string
    stiffness_ra?: number
  }
  affiliateUrls?: {
    amazon?: string
    rakuten?: string
    xebio?: string
  }
  avgScores: {
    power: number
    spin: number
    control: number
    comfort: number
    durability: number
  }
  aiSummary?: {
    summaryText: string
    pros: string[]
    cons: string[]
    targetPlayer: string
  }
  reviews: Array<{
    id: string
    username: string
    avatarUrl?: string
    stringType: StringType
    stringBrand?: string
    tensionMain: number
    commentText: string
    scores: { power: number; spin: number; control: number; comfort: number; durability: number }
    createdAt: string
  }>
}

interface StringAdviceResult {
  armStressLevel: 1 | 2 | 3 | 4 | 5
  headline: string
  details: string
  suggestions: string[]
}

// ─── Mock data (本番では Server Component から props で受け取る) ──────────────

const MOCK_RACKET: RacketDetail = {
  id: '1',
  brand: 'Wilson',
  modelName: 'Pro Staff 97 v14',
  specs: {
    weight_g: 315,
    balance_mm: 310,
    face_size_sq_inch: 97,
    string_pattern: '16x19',
    stiffness_ra: 64,
  },
  affiliateUrls: {
    amazon: '#amazon',
    rakuten: '#rakuten',
    xebio: '#xebio',
  },
  avgScores: { power: 6.2, spin: 7.8, control: 9.1, comfort: 6.5, durability: 8.0 },
  aiSummary: {
    summaryText:
      'Pro Staff 97 v14は、精密なコントロールと高いスピン性能を武器にするプレイヤーのための職人的ラケットです。パワーより技術を優先するプレイヤーに長年支持されています。',
    pros: ['圧倒的なコントロール性', '高いスピン性能', '打球感のフィードバックが明確'],
    cons: ['パワーは控えめ', 'テクニックが必要', 'スイートスポットが狭い'],
    targetPlayer: 'テクニカル系ベースライナー / 中上級〜上級者',
  },
  reviews: [
    {
      id: 'r1',
      username: 'FedererFan_Kenji',
      stringType: 'poly',
      stringBrand: 'Luxilon ALU Power',
      tensionMain: 52,
      commentText:
        'コントロールが神。フォアの打ち込みが気持ちよく決まる。ただ肘が少し気になり始めた。',
      scores: { power: 6, spin: 8, control: 10, comfort: 5, durability: 8 },
      createdAt: '2026-02-15',
    },
    {
      id: 'r2',
      username: 'Smash_Yuki',
      stringType: 'natural_gut',
      stringBrand: 'Babolat VS Touch',
      tensionMain: 58,
      commentText:
        'ナチュラルガットとの相性が抜群。打球感が柔らかく、精度が格段に上がった。',
      scores: { power: 7, spin: 8, control: 9, comfort: 8, durability: 6 },
      createdAt: '2026-01-30',
    },
  ],
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

const STRING_TYPE_LABELS: Record<StringType, string> = {
  poly:          'ポリエステル',
  nylon:         'ナイロン',
  natural_gut:   'ナチュラルガット',
  hybrid:        'ハイブリッド',
  multifilament: 'マルチフィラメント',
}

const STRING_TYPE_COLORS: Record<StringType, string> = {
  poly:          'bg-red-100 text-red-700',
  nylon:         'bg-blue-100 text-blue-700',
  natural_gut:   'bg-yellow-100 text-yellow-800',
  hybrid:        'bg-purple-100 text-purple-700',
  multifilament: 'bg-green-100 text-green-700',
}

function armStressColor(level: number) {
  if (level <= 2) return 'text-emerald-600'
  if (level === 3) return 'text-amber-500'
  return 'text-red-500'
}

function scoreToRadarData(scores: RacketDetail['avgScores']) {
  return [
    { subject: 'パワー',    value: scores.power,      fullMark: 10 },
    { subject: 'スピン',    value: scores.spin,        fullMark: 10 },
    { subject: 'コントロール', value: scores.control,   fullMark: 10 },
    { subject: '快適性',   value: scores.comfort,     fullMark: 10 },
    { subject: '耐久性',   value: scores.durability,  fullMark: 10 },
  ]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpecBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</span>
      <span className="mt-1 text-lg font-bold text-zinc-800">{value}</span>
    </div>
  )
}

function ScoreBar({ label, icon: Icon, value }: {
  label: string
  icon: React.ElementType
  value: number
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
      <span className="w-20 text-sm text-zinc-600">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-zinc-100 h-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-semibold text-zinc-700">{value.toFixed(1)}</span>
    </div>
  )
}

function ArmStressMeter({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-2 w-6 rounded-full transition-colors ${
            n <= level
              ? level <= 2 ? 'bg-emerald-400'
              : level === 3 ? 'bg-amber-400'
              : 'bg-red-500'
              : 'bg-zinc-200'
          }`}
        />
      ))}
      <span className={`ml-1 text-sm font-semibold ${armStressColor(level)}`}>
        {level}/5
      </span>
    </div>
  )
}

// ─── String Advice Panel ──────────────────────────────────────────────────────

function StringAdvicePanel({ racketId, stiffnessRa }: { racketId: string; stiffnessRa?: number }) {
  const [stringType, setStringType] = useState<StringType>('poly')
  const [tension, setTension] = useState(52)
  const [advice, setAdvice] = useState<StringAdviceResult | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleAnalyze() {
    startTransition(async () => {
      // 本番では Server Action を呼ぶ。ここではクライアントから API Route を叩く例。
      const res = await fetch('/api/string-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ racketId, stringType, tensionMain: tension, stiffnessRa }),
      })
      if (res.ok) setAdvice(await res.json())
    })
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
        <Sparkles className="h-5 w-5 text-violet-500" />
        AI ガット × テンション診断
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        張り方を選ぶと Claude が腕への負担とアドバイスを提示します。
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {/* ガット種別選択 */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            ガットの種類
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STRING_TYPE_LABELS) as StringType[]).map((type) => (
              <button
                key={type}
                onClick={() => setStringType(type)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  stringType === type
                    ? 'ring-2 ring-violet-500 ' + STRING_TYPE_COLORS[type]
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {STRING_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* テンション選択 */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
            テンション: <span className="text-violet-600 font-bold">{tension} lbs</span>
          </label>
          <input
            type="range"
            min={40}
            max={65}
            value={tension}
            onChange={(e) => setTension(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-zinc-400 mt-1">
            <span>40 (低)</span><span>65 (高)</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={isPending}
        className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? '分析中…' : 'Claude に聞く'}
      </button>

      {/* アドバイス結果 */}
      {advice && (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${armStressColor(advice.armStressLevel)}`} />
            <div>
              <p className="font-semibold text-zinc-800">{advice.headline}</p>
              <div className="mt-1">
                <ArmStressMeter level={advice.armStressLevel} />
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed">{advice.details}</p>
          {advice.suggestions.length > 0 && (
            <ul className="space-y-1">
              {advice.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                  <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-violet-400" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RacketDetailPage() {
  // 本番では params.id で DB からフェッチ。ここはモックデータを使用。
  const racket = MOCK_RACKET
  const radarData = scoreToRadarData(racket.avgScores)

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">
            {racket.brand}
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{racket.modelName}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {racket.specs.weight_g}g
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {racket.specs.face_size_sq_inch} sq.in
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {racket.specs.string_pattern}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SpecBadge label="重量" value={`${racket.specs.weight_g}g`} />
          <SpecBadge label="バランス" value={`${racket.specs.balance_mm}mm`} />
          <SpecBadge label="フェイス" value={`${racket.specs.face_size_sq_inch}sq`} />
          <SpecBadge label="RA値" value={racket.specs.stiffness_ra ?? '—'} />
        </div>

        {/* Radar + Scores */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Radar Chart */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-zinc-800">パフォーマンスチャート</h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 12, fill: '#71717a' }}
                />
                <PolarRadiusAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  axisLine={false}
                />
                <Radar
                  name={racket.modelName}
                  dataKey="value"
                  stroke="#7c3aed"
                  fill="#7c3aed"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '0.75rem', fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(1)} / 10`, '']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </section>

          {/* Score bars */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-zinc-800">スコア詳細 (レビュー平均)</h2>
            <div className="space-y-4">
              <ScoreBar label="パワー"     icon={Zap}    value={racket.avgScores.power} />
              <ScoreBar label="スピン"     icon={Star}   value={racket.avgScores.spin} />
              <ScoreBar label="コントロール" icon={Target} value={racket.avgScores.control} />
              <ScoreBar label="快適性"     icon={Heart}  value={racket.avgScores.comfort} />
              <ScoreBar label="耐久性"     icon={Shield} value={racket.avgScores.durability} />
            </div>
          </section>
        </div>

        {/* AI Summary */}
        {racket.aiSummary && (
          <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              Claude によるレビュー総評
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-700">
              {racket.aiSummary.summaryText}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">強み</p>
                <ul className="space-y-1">
                  {racket.aiSummary.pros.map((p, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-700">
                      <span className="text-emerald-500">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-500">弱み</p>
                <ul className="space-y-1">
                  {racket.aiSummary.cons.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-zinc-700">
                      <span className="text-red-400">✕</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm text-zinc-600">
              <span className="font-semibold">こんな人におすすめ:</span>{' '}
              {racket.aiSummary.targetPlayer}
            </div>
          </section>
        )}

        {/* String Advice */}
        <StringAdvicePanel
          racketId={racket.id}
          stiffnessRa={racket.specs.stiffness_ra}
        />

        {/* Purchase Links */}
        {racket.affiliateUrls && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
              <ShoppingCart className="h-5 w-5 text-zinc-500" />
              購入する
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {racket.affiliateUrls.amazon && (
                <a
                  href={racket.affiliateUrls.amazon}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-zinc-900 hover:bg-amber-500 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Amazon で見る
                </a>
              )}
              {racket.affiliateUrls.rakuten && (
                <a
                  href={racket.affiliateUrls.rakuten}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  楽天で見る
                </a>
              )}
              {racket.affiliateUrls.xebio && (
                <a
                  href={racket.affiliateUrls.xebio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border-2 border-zinc-800 px-5 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  ゼビオで見る
                </a>
              )}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-zinc-800">
            ユーザーレビュー ({racket.reviews.length}件)
          </h2>
          <div className="space-y-4">
            {racket.reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
                      {review.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-800">{review.username}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STRING_TYPE_COLORS[review.stringType]}`}>
                          {STRING_TYPE_LABELS[review.stringType]}
                        </span>
                        {review.stringBrand && (
                          <span className="text-xs text-zinc-400">{review.stringBrand}</span>
                        )}
                        <span className="text-xs text-zinc-400">{review.tensionMain}lbs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    {review.createdAt}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{review.commentText}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  {[
                    ['P', review.scores.power],
                    ['Sp', review.scores.spin],
                    ['Co', review.scores.control],
                    ['Cm', review.scores.comfort],
                    ['D', review.scores.durability],
                  ].map(([label, val]) => (
                    <span key={label as string} className="text-xs text-zinc-500">
                      {label}: <strong className="text-zinc-700">{val}</strong>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
