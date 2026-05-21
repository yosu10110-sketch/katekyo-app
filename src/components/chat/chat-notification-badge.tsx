'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

export function ChatNotificationBadge({ userId }: { userId: string }) {
  const [count, setCount] = useState(0)
  const pathname = usePathname()
  const supabase = createClient()
  const channelId = useRef(`sidebar_badge_${userId}_${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    // チャットページを開いている間はバッジをリセット
    if (pathname.startsWith('/chat')) {
      setCount(0)
      return
    }

    let roomIds: string[] = []

    async function loadUnread() {
      // 自分が参加しているルーム一覧
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .or(`teacher_id.eq.${userId},student_id.eq.${userId},parent_id.eq.${userId}`)
      roomIds = rooms?.map((r) => r.id) ?? []
      if (roomIds.length === 0) return

      // 各ルームの最終既読時刻をlocalStorageから取得
      let totalUnread = 0
      for (const roomId of roomIds) {
        // デフォルトは現在時刻（初回ログイン時は既読扱い）
        const lastRead = localStorage.getItem(`chat_last_read_${roomId}`) ?? new Date().toISOString()
        const { count: c } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId)
          .neq('sender_id', userId)
          .gt('created_at', lastRead)
        totalUnread += c ?? 0
      }
      setCount(totalUnread)
    }

    loadUnread()

    // リアルタイムで新着追加
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as { room_id: string; sender_id: string }
          if (msg.sender_id !== userId && roomIds.includes(msg.room_id)) {
            setCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, pathname, supabase])

  if (count === 0) return null

  return (
    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 leading-5 min-w-[20px] text-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}
