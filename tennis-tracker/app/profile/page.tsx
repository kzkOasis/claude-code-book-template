'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input, Select, Label } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile]     = useState<Partial<Profile>>({})
  const [name, setName]           = useState('')
  const [hand, setHand]           = useState<'right' | 'left'>('right')
  const [style, setStyle]         = useState('baseliner')
  const [racket, setRacket]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setName(data.display_name || '')
        setHand(data.dominant_hand || 'right')
        setStyle(data.play_style || 'baseliner')
        setRacket(data.racket || '')
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: name,
      dominant_hand: hand,
      play_style: style,
      racket: racket || null,
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="pb-24 px-4">
      <div className="pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">プロフィール</h1>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <div>
              <Label>表示名</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="山田 太郎" />
            </div>
            <div>
              <Label>利き手</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['right', 'left'] as const).map(h => (
                  <button key={h} type="button" onClick={() => setHand(h)}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      hand === h ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'
                    }`}>
                    {h === 'right' ? '右利き' : '左利き'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>プレースタイル</Label>
              <Select value={style} onChange={e => setStyle(e.target.value)}>
                <option value="baseliner">ベースライナー</option>
                <option value="serve_volley">サーブ＆ボレー</option>
                <option value="allcourt">オールラウンド</option>
                <option value="aggressive">アグレッシブ</option>
              </Select>
            </div>
            <div>
              <Label>使用ラケット（任意）</Label>
              <Input value={racket} onChange={e => setRacket(e.target.value)} placeholder="例: Wilson Pro Staff 97" />
            </div>
          </CardBody>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {saved ? '✓ 保存しました' : loading ? '保存中...' : 'プロフィールを保存'}
        </Button>
      </form>

      <div className="mt-6">
        <Button variant="destructive" size="lg" className="w-full" onClick={handleLogout}>
          ログアウト
        </Button>
      </div>
    </div>
  )
}
