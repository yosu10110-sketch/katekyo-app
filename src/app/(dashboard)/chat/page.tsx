import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatWindow } from '@/components/chat/chat-window'
import { ChatContactList } from '@/components/chat/chat-contact-list'
import { MessageCircle } from 'lucide-react'
import type { Profile, ChatRoom, ChatMessage } from '@/types'

type Contact = {
  id: string
  name: string
  type: 'teacher_student' | 'teacher_parent'
  room: ChatRoom | null
  latestMessage: string | null
  latestAt: string | null
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string; student?: string }>
}) {
  const { room: activeRoomId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const { role } = profile as Profile

  // ========== 教師：全連絡先（生徒＋保護者）を取得 ==========
  let contacts: Contact[] = []
  let messages: (ChatMessage & { profiles: { full_name: string } })[] = []
  let activeRoom: ChatRoom | null = null

  if (role === 'teacher') {
    // 担当生徒
    const { data: sRels } = await supabase
      .from('teacher_student_relationships')
      .select('student_id, profiles!teacher_student_relationships_student_id_fkey(id, full_name)')
      .eq('teacher_id', user.id)

    // 担当生徒の保護者
    const studentIds = sRels?.map((r) => r.student_id) ?? []
    const { data: pRels } = studentIds.length > 0
      ? await supabase
          .from('parent_student_relationships')
          .select('parent_id, profiles!parent_student_relationships_parent_id_fkey(id, full_name)')
          .in('student_id', studentIds)
      : { data: [] }

    // 既存ルーム取得
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('teacher_id', user.id)

    const roomMap = new Map<string, ChatRoom>()
    for (const r of rooms ?? []) {
      const key = r.room_type === 'teacher_student' ? r.student_id : r.parent_id
      if (key) roomMap.set(key, r as ChatRoom)
    }

    // 各ルームの最新メッセージ
    const latestMsgMap = new Map<string, { content: string; created_at: string }>()
    for (const [, room] of roomMap) {
      const { data: msg } = await supabase
        .from('chat_messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (msg) latestMsgMap.set(room.id, msg)
    }

    // 生徒の連絡先
    const studentContacts: Contact[] = (sRels ?? []).map((r) => {
      const p = r.profiles as unknown as { id: string; full_name: string }
      const room = roomMap.get(r.student_id) ?? null
      const latest = room ? latestMsgMap.get(room.id) ?? null : null
      return {
        id: r.student_id,
        name: p?.full_name ?? '生徒',
        type: 'teacher_student',
        room,
        latestMessage: latest?.content ?? null,
        latestAt: latest?.created_at ?? null,
      }
    })

    // 保護者の連絡先
    const parentContacts: Contact[] = (pRels ?? []).map((r) => {
      const p = r.profiles as unknown as { id: string; full_name: string }
      const room = roomMap.get(r.parent_id) ?? null
      const latest = room ? latestMsgMap.get(room.id) ?? null : null
      return {
        id: r.parent_id,
        name: p?.full_name ?? '保護者',
        type: 'teacher_parent',
        room,
        latestMessage: latest?.content ?? null,
        latestAt: latest?.created_at ?? null,
      }
    })

    // 重複除去（同じ保護者が複数生徒に紐付いている場合）
    const seen = new Set<string>()
    contacts = [...studentContacts, ...parentContacts].filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    // 最新メッセージ順にソート
    contacts.sort((a, b) => {
      if (!a.latestAt && !b.latestAt) return 0
      if (!a.latestAt) return 1
      if (!b.latestAt) return -1
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
    })

    // アクティブルーム
    if (activeRoomId) {
      activeRoom = (rooms ?? []).find((r) => r.id === activeRoomId) as ChatRoom ?? null
    }
    // デスクトップのみ自動選択（モバイルはURL指定時のみ）
    // activeRoomIdが指定されていない場合はnullのまま
  } else {
    // 生徒・保護者：既存ルームのみ表示
    const roomsQuery = role === 'student'
      ? supabase.from('chat_rooms').select('*').eq('room_type', 'teacher_student').eq('student_id', user.id)
      : supabase.from('chat_rooms').select('*').eq('room_type', 'teacher_parent').eq('parent_id', user.id)
    const { data: rooms } = await roomsQuery

    for (const room of rooms ?? []) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', room.teacher_id).single()
      const { data: msg } = await supabase
        .from('chat_messages').select('content, created_at')
        .eq('room_id', room.id).order('created_at', { ascending: false }).limit(1).single()
      contacts.push({
        id: room.teacher_id,
        name: p?.full_name ?? '教師',
        type: role === 'student' ? 'teacher_student' : 'teacher_parent',
        room: room as ChatRoom,
        latestMessage: msg?.content ?? null,
        latestAt: msg?.created_at ?? null,
      })
    }
    if (activeRoomId) {
      activeRoom = (rooms ?? []).find((r) => r.id === activeRoomId) as ChatRoom ?? null
    }
    // activeRoomIdが指定されていない場合はnullのまま
  }

  // アクティブルームのメッセージ
  if (activeRoom) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles!chat_messages_sender_id_fkey(full_name)')
      .eq('room_id', activeRoom.id)
      .order('created_at', { ascending: true })
    messages = (data ?? []) as typeof messages
  }

  const activeContact = contacts.find((c) => c.room?.id === activeRoom?.id)
  const showRoom = !!activeRoomId && !!activeRoom

  const contactListData = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    roomId: c.room?.id ?? null,
    latestMessage: c.latestMessage,
    latestAt: c.latestAt,
  }))

  return (
    <div className="flex h-[calc(100vh-7rem)] md:rounded-xl md:border md:border-gray-200 overflow-hidden bg-white">

      {/* 連絡先リスト：モバイルはroomが選択されていない時のみ表示 */}
      <div className={`${showRoom ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 border-r border-gray-100 flex-col`}>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">メッセージ</p>
        </div>
        <ChatContactList
          contacts={contactListData}
          activeRoomId={activeRoom?.id ?? null}
          currentUserId={user.id}
        />
      </div>

      {/* チャットエリア：モバイルはroomが選択された時のみ表示 */}
      <div className={`${showRoom ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
        {activeRoom && activeContact ? (
          <>
            <div className="h-12 border-b border-gray-100 flex items-center px-4 gap-3 shrink-0">
              {/* モバイル：戻るボタン */}
              <a href="/chat" className="md:hidden text-gray-500 hover:text-gray-700 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold ${
                activeContact.type === 'teacher_student' ? 'bg-indigo-400' : 'bg-amber-400'
              }`}>
                {activeContact.name[0]}
              </div>
              <span className="font-medium text-gray-900 text-sm">{activeContact.name}</span>
              <span className="text-xs text-gray-400">
                {activeContact.type === 'teacher_student' ? '生徒' : '保護者'}
              </span>
            </div>
            <ChatWindow
              roomId={activeRoom.id}
              initialMessages={messages}
              currentUserId={user.id}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-14 w-14 text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">連絡先を選択してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
