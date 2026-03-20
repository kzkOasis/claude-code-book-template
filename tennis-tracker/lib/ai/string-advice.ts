/**
 * Racket Lab — AI String Advice (Vercel AI SDK + Claude)
 *
 * ユーザーが選択した「ラケット × ガット × テンション」の組み合わせを元に、
 * Claude が腕への負担・プレースタイル適合度などのアドバイスをストリームで返す。
 */
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, streamText } from 'ai'

// ─── Types ───────────────────────────────────────────────────────────────────

export type StringType = 'poly' | 'nylon' | 'natural_gut' | 'hybrid' | 'multifilament'
export type PlayStyle  = 'baseliner' | 'serve_volley' | 'allcourt' | 'aggressive_baseliner'
export type NtrpLevel  = 'beginner' | 'intermediate' | 'advanced' | 'elite'

export interface StringSetup {
  stringType: StringType
  stringBrand?: string
  tensionMain: number   // lbs
  tensionCross?: number // lbs (省略時は tensionMain と同値)
}

export interface RacketSpecs {
  brand: string
  modelName: string
  weight_g: number
  face_size_sq_inch: number
  stiffness_ra?: number // RA 値が高いほど腕への負担↑
}

export interface PlayerProfile {
  playStyle: PlayStyle
  ntrpLevel: NtrpLevel
  /** 肘・手首に既往がある場合 true */
  hasArmIssues?: boolean
}

export interface StringAdvice {
  /** 腕への負担レベル (1=低い, 5=高い) */
  armStressLevel: 1 | 2 | 3 | 4 | 5
  /** メインメッセージ (1行) */
  headline: string
  /** 詳細アドバイス */
  details: string
  /** 改善提案 (オプション) */
  suggestions: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STRING_TYPE_JP: Record<StringType, string> = {
  poly:          'ポリエステル',
  nylon:         'ナイロン（シンセティック）',
  natural_gut:   'ナチュラルガット',
  hybrid:        'ハイブリッド（ポリ×ナチュラル）',
  multifilament: 'マルチフィラメント',
}

const PLAY_STYLE_JP: Record<PlayStyle, string> = {
  baseliner:            'ベースライナー',
  serve_volley:         'サーブ＆ボレー',
  allcourt:             'オールコート',
  aggressive_baseliner: 'アグレッシブ・ベースライナー',
}

const NTRP_JP: Record<NtrpLevel, string> = {
  beginner:     '初級 (NTRP 1.0–2.5)',
  intermediate: '中級 (NTRP 3.0–3.5)',
  advanced:     '上級 (NTRP 4.0–4.5)',
  elite:        'エリート (NTRP 5.0+)',
}

function buildPrompt(
  racket: RacketSpecs,
  setup: StringSetup,
  player: PlayerProfile,
): string {
  const crossTension = setup.tensionCross ?? setup.tensionMain
  const stringLabel  = STRING_TYPE_JP[setup.stringType]
  const styleLabel   = PLAY_STYLE_JP[player.playStyle]
  const ntrpLabel    = NTRP_JP[player.ntrpLevel]
  const brandNote    = setup.stringBrand ? `(${setup.stringBrand})` : ''
  const raNote       = racket.stiffness_ra ? `RA値 ${racket.stiffness_ra}` : 'RA値不明'
  const armNote      = player.hasArmIssues ? '※ このプレイヤーは肘・手首に既往症があります。' : ''

  return `
あなたはテニス機材の専門アナリストです。
以下の組み合わせを分析し、JSON 形式でアドバイスを返してください。

## ラケット情報
- ブランド / モデル: ${racket.brand} ${racket.modelName}
- 重量: ${racket.weight_g}g
- フェイスサイズ: ${racket.face_size_sq_inch} sq.in
- ${raNote}

## ガット設定
- 種類: ${stringLabel} ${brandNote}
- テンション: メイン ${setup.tensionMain}lbs / クロス ${crossTension}lbs

## プレイヤー情報
- プレイスタイル: ${styleLabel}
- レベル: ${ntrpLabel}
${armNote}

## 出力形式 (JSON のみ、説明不要)
{
  "armStressLevel": <1–5 の整数>,
  "headline": "<腕への負担を一言で表す日本語のメッセージ>",
  "details": "<2〜3文の詳細解説>",
  "suggestions": ["<改善案1>", "<改善案2>"]
}
`.trim()
}

// ─── Main Functions ───────────────────────────────────────────────────────────

/**
 * generateStringAdvice — 一括生成版。
 * Server Action や API Route から呼び出す。
 */
export async function generateStringAdvice(
  racket: RacketSpecs,
  setup: StringSetup,
  player: PlayerProfile,
): Promise<StringAdvice> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    prompt: buildPrompt(racket, setup, player),
    maxOutputTokens: 400,
  })

  // Claude が JSON ブロックで返した場合のクリーンアップ
  const json = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(json) as StringAdvice
}

/**
 * streamStringAdvice — ストリーミング版。
 * Next.js Route Handler (app/api/string-advice/route.ts) で使用。
 */
export function streamStringAdvice(
  racket: RacketSpecs,
  setup: StringSetup,
  player: PlayerProfile,
) {
  return streamText({
    model: anthropic('claude-sonnet-4-6'),
    prompt: buildPrompt(racket, setup, player),
    maxOutputTokens: 400,
  })
}

// ─── Rule-based fallback (API キー不要・テスト用) ────────────────────────────

/**
 * getHeuristicAdvice — Claude を呼ばずにルールベースで腕負担スコアを算出。
 * 開発時のフォールバック、またはユニットテスト向け。
 */
export function getHeuristicAdvice(
  racket: RacketSpecs,
  setup: StringSetup,
): Pick<StringAdvice, 'armStressLevel' | 'headline'> {
  let score = 3 // ベースライン

  // ポリ × 高テンションは腕に厳しい
  if (setup.stringType === 'poly') score += 1
  if (setup.tensionMain >= 55)      score += 1
  if (setup.tensionMain <= 45)      score -= 1

  // 高剛性ラケット（RA値 > 67）は振動が伝わりやすい
  if (racket.stiffness_ra && racket.stiffness_ra > 67) score += 1

  // ナチュラルガット / マルチは腕に優しい
  if (setup.stringType === 'natural_gut' || setup.stringType === 'multifilament') score -= 1

  const clamped = Math.max(1, Math.min(5, score)) as 1 | 2 | 3 | 4 | 5

  const headlines: Record<number, string> = {
    1: 'この組み合わせは腕への負担が非常に少なく、長時間プレーにも向いています。',
    2: 'この組み合わせは腕への負担が少なめで、快適にプレーできます。',
    3: 'この組み合わせは標準的な負担感です。',
    4: 'この組み合わせは腕への負担が強めです。肘・手首に注意してください。',
    5: 'この組み合わせは腕への負担が非常に高く、故障リスクがあります。',
  }

  return { armStressLevel: clamped, headline: headlines[clamped] }
}
