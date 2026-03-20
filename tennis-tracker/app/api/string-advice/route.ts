/**
 * POST /api/string-advice
 * Claude にガット×テンション診断を依頼し JSON で返す Route Handler。
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateStringAdvice, getHeuristicAdvice } from '@/lib/ai/string-advice'
import type { StringType } from '@/lib/ai/string-advice'

export async function POST(req: NextRequest) {
  const { racketId, stringType, tensionMain, stiffnessRa } = await req.json() as {
    racketId: string
    stringType: StringType
    tensionMain: number
    stiffnessRa?: number
  }

  // ANTHROPIC_API_KEY が設定されていない場合はヒューリスティックにフォールバック
  if (!process.env.ANTHROPIC_API_KEY) {
    const { armStressLevel, headline } = getHeuristicAdvice(
      { brand: '', modelName: '', weight_g: 300, face_size_sq_inch: 97, stiffness_ra: stiffnessRa },
      { stringType, tensionMain },
    )
    return NextResponse.json({
      armStressLevel,
      headline,
      details: 'AI 診断を有効にするには ANTHROPIC_API_KEY を設定してください。',
      suggestions: [],
    })
  }

  try {
    const advice = await generateStringAdvice(
      {
        brand: 'Wilson',
        modelName: 'Pro Staff 97 v14',
        weight_g: 315,
        face_size_sq_inch: 97,
        stiffness_ra: stiffnessRa,
      },
      { stringType, tensionMain },
      {
        playStyle: 'baseliner',
        ntrpLevel: 'advanced',
      },
    )
    return NextResponse.json(advice)
  } catch (err) {
    console.error('[string-advice]', err)
    return NextResponse.json({ error: 'AI診断に失敗しました' }, { status: 500 })
  }
}
