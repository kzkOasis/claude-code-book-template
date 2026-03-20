import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Match, SetScore } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calcWinner(sets: SetScore[]): boolean {
  let mineSets = 0, oppSets = 0
  for (const s of sets) {
    if (s.mine > s.opponent) mineSets++
    else if (s.opponent > s.mine) oppSets++
  }
  return mineSets > oppSets
}

export function formatScore(sets: SetScore[]): string {
  return sets.map(s => {
    let str = `${s.mine}-${s.opponent}`
    if (s.tiebreak_mine !== undefined && s.tiebreak_opponent !== undefined) {
      const loser = Math.min(s.tiebreak_mine, s.tiebreak_opponent)
      str += `(${loser})`
    }
    return str
  }).join(' ')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function getWinRate(matches: Match[]): number {
  if (!matches.length) return 0
  return Math.round((matches.filter(m => m.won).length / matches.length) * 100)
}

export function getRecentForm(matches: Match[], n = 5): ('W' | 'L')[] {
  return [...matches]
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, n)
    .map(m => m.won ? 'W' : 'L')
}
