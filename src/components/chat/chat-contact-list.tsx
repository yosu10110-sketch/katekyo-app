'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

type Contact = {
  id: string
  name: string
  type: 'teacher_student' | 'teacher_parent'
  roomId: string | null
  latestMessage: string | null
  latestAt: string | null
}

interface ChatContactListProps {
  contacts: Contact[]
  activeRoomId: string | null
  currentUserId: string
}

export function ChatContactList({ contacts: initial, activeRoomId, currentUserId }: ChatContactListProps) {
  const [contacts, setContacts] = useState(initial)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const supabase = createClient()

  useEffect(() => {
    const roomIds = contacts.map((c) => c.roomId).filter(Boolean) as string[]
    if (roomIds.length === 0) return

    // 全ルームのメッセージをリアルタイム購読
    const channel = supabase
      .channel('all_rooms_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as { room_id: string; content: string; created_at: string; sender_id: string }
          if (!roomIds.includes(msg.room_id)) return

          // 連絡先の最新メッセージを更新
          setContacts((prev) =>
            prev
              .map((c) =>
                c.roomId === msg.room_id
                  ? { ...c, latestMessage: msg.content, latestAt: msg.created_at }
                  : c
              )
              .sort((a, b) => {
                if (!a.latestAt && !b.latestAt) return 0
                if (!a.latestAt) return 1
                if (!b.latestAt) return -1
                return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
              })
          )

          // アクティブでないルームの未読カウントを増加
          if (msg.room_id !== activeRoomId && msg.sender_id !== currentUserId) {
            setUnread((prev) => ({
              ...prev,
              [msg.room_id]: (prev[msg.room_id] ?? 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [contacts, activeRoomId, currentUserId, supabase])

  // アクティブルームの未読をリセット＋既読時刻を記録
  useEffect(() => {
    if (activeRoomId) {
      setUnread((prev) => ({ ...prev, [activeRoomId]: 0 }))
      localStorage.setItem(`chat_last_read_${activeRoomId}`, new Date().toISOString())
    }
  }, [activeRoomId])

  return (
    <div className="flex-1 overflow-y-auto">
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <MessageCircle className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">連絡先がありません</p>
          <p className="text-xs text-gray-300 mt-1">メンバー管理から生徒を追加してください</p>
        </div>
      ) : (
        contacts.map((contact) => {
          const isActive = activeRoomId === contact.roomId && contact.roomId !== null
          const href = contact.roomId
            ? `/chat?room=${contact.roomId}`
            : `/chat/create?target=${contact.type}:${contact.id}`
          const unreadCount = contact.roomId ? (unread[contact.roomId] ?? 0) : 0

          return (
            <Link
              key={`${contact.type}-${contact.id}`}
              href={href}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
              }`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm ${
                contact.type === 'teacher_student' ? 'bg-indigo-400' : 'bg-amber-400'
              }`}>
                {contact.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                    {contact.name}
                  </p>
                  {contact.latestAt && (
                    <p className="text-xs text-gray-400 shrink-0">
                      {new Date(contact.latestAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate ${unreadCount > 0 ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                    {contact.latestMessage ?? (
                      <span className="text-indigo-400">
                        {contact.type === 'teacher_student' ? '生徒' : '保護者'}・タップして開始
                      </span>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <span className="ml-2 shrink-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-4">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}
