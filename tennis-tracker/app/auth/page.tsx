'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export default function AuthPage() {
  const [mode, setMode]       = useState<'login' | 'signup'>('login')
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 mb-4">
            <span className="text-3xl">🎾</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tennis Tracker</h1>
          <p className="text-white/40 text-sm mt-1">シングルス戦績管理アプリ</p>
        </div>

        {/* Tab */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/10">
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === m ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <Label htmlFor="name">表示名</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)}
                placeholder="山田 太郎" required />
            </div>
          )}
          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required />
          </div>
          <div>
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" type="password" value={password} onChange={e => setPass(e.target.value)}
              placeholder={mode === 'signup' ? '6文字以上' : ''} required minLength={6} />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウント作成'}
          </Button>
        </form>
      </div>
    </div>
  )
}
