'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { sendMessage } from '@/app/actions/chat'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import type { ChatMessage, Profile } from '@/types'

type MessageWithProfile = ChatMessage & { profiles: Pick<Profile, 'full_name'> }

interface ChatWindowProps {
  roomId: string
  initialMessages: MessageWithProfile[]
  currentUserId: string
}

export function ChatWindow({ roomId, initialMessages, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Realtime購読
  useEffect(() => {
    const channel = supabase
      .channel(`chat_room_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage
          // プロフィールを取得
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newMsg.sender_id)
            .single()
          setMessages((prev) => [
            ...prev,
            { ...newMsg, profiles: profileData ?? { full_name: '不明' } } as MessageWithProfile,
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, supabase])

  // 新着時に最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    setInput('')
    const fd = new FormData()
    fd.append('room_id', roomId)
    fd.append('content', content)
    await sendMessage(fd)
    setSending(false)
  }

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // PCのみEnterで送信、モバイルは送信ボタンのみ
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function groupDate(iso: string) {
    return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">メッセージはまだありません。最初のメッセージを送りましょう！</p>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === currentUserId
          const showDate = i === 0 || groupDate(messages[i - 1].created_at) !== groupDate(msg.created_at)

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-xs text-gray-400 my-3">
                  {groupDate(msg.created_at)}
                </div>
              )}
              <div className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-xs text-gray-500 mb-0.5 px-1">{msg.profiles?.full_name}</span>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5 px-1">
                    {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 入力欄 */}
      <div className="border-t border-gray-200 bg-white p-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isMobile ? "メッセージを入力" : "メッセージを入力（Enterで送信）"}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 max-h-32 overflow-y-auto"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 128) + 'px'
          }}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="h-9 w-9 p-0 rounded-xl shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
