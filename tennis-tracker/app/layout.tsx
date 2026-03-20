import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tennis Tracker',
  description: 'テニス シングルス戦績管理アプリ',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        <div className="max-w-md mx-auto min-h-screen relative">
          {children}
          <Navbar />
        </div>
      </body>
    </html>
  )
}
