export type Surface = 'omni' | 'hard' | 'clay' | 'carpet' | 'grass'
export type MatchType = 'tournament' | 'practice' | 'league'

export interface SetScore {
  mine: number
  opponent: number
  tiebreak_mine?: number
  tiebreak_opponent?: number
}

export interface Match {
  id: string
  user_id: string
  opponent_name: string
  match_date: string
  tournament_name?: string
  match_type: MatchType
  surface: Surface
  sets: SetScore[]
  won: boolean
  // Optional stats
  aces?: number
  double_faults?: number
  unforced_errors?: number
  winners?: number
  notes?: string
  created_at: string
}

export interface Profile {
  id: string
  display_name: string
  dominant_hand: 'right' | 'left'
  play_style: 'baseliner' | 'serve_volley' | 'allcourt' | 'aggressive'
  racket?: string
  created_at: string
}

export type SurfaceLabel = Record<Surface, string>
export type MatchTypeLabel = Record<MatchType, string>

export const SURFACE_LABELS: SurfaceLabel = {
  omni: 'オムニ',
  hard: 'ハード',
  clay: 'クレー',
  carpet: 'カーペット',
  grass: 'グラス',
}

export const SURFACE_COLORS: Record<Surface, string> = {
  omni:    '#22c55e',
  hard:    '#3b82f6',
  clay:    '#f97316',
  carpet:  '#8b5cf6',
  grass:   '#10b981',
}

export const MATCH_TYPE_LABELS: MatchTypeLabel = {
  tournament: '大会',
  practice:   '練習試合',
  league:     'リーグ',
}
