import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'
import type { Surface, MatchType } from '@/types'
import { SURFACE_LABELS, MATCH_TYPE_LABELS, SURFACE_COLORS } from '@/types'

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold', className)}
      {...props}
    >
      {children}
    </span>
  )
}

export function SurfaceBadge({ surface }: { surface: Surface }) {
  const colorMap: Record<Surface, string> = {
    omni:    'bg-emerald-500/20 text-emerald-400',
    hard:    'bg-blue-500/20 text-blue-400',
    clay:    'bg-orange-500/20 text-orange-400',
    carpet:  'bg-purple-500/20 text-purple-400',
    grass:   'bg-teal-500/20 text-teal-400',
  }
  return <Badge className={colorMap[surface]}>{SURFACE_LABELS[surface]}</Badge>
}

export function MatchTypeBadge({ type }: { type: MatchType }) {
  const colorMap: Record<MatchType, string> = {
    tournament: 'bg-yellow-500/20 text-yellow-400',
    practice:   'bg-white/10 text-white/60',
    league:     'bg-pink-500/20 text-pink-400',
  }
  return <Badge className={colorMap[type]}>{MATCH_TYPE_LABELS[type]}</Badge>
}

export function WinBadge({ won }: { won: boolean }) {
  return (
    <Badge className={won
      ? 'bg-emerald-500/20 text-emerald-400 text-base font-bold'
      : 'bg-red-500/20 text-red-400 text-base font-bold'
    }>
      {won ? 'W' : 'L'}
    </Badge>
  )
}
