'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, BarChart2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', icon: Home,        label: 'ホーム' },
  { href: '/matches/new', icon: PlusCircle, label: '記録' },
  { href: '/stats',      icon: BarChart2,   label: '分析' },
  { href: '/profile',    icon: User,        label: 'プロフィール' },
]

export function Navbar() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#111] border-t border-white/10 max-w-md mx-auto">
      <div className="flex items-stretch h-16">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                active ? 'text-blue-400' : 'text-white/40 hover:text-white/70'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px]">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
