'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteMatchButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!confirm('この試合記録を削除しますか？')) return
    await supabase.from('matches').delete().eq('id', id)
    router.push('/matches')
    router.refresh()
  }

  return (
    <button onClick={handleDelete}
      className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-colors">
      <Trash2 size={16} />
    </button>
  )
}
