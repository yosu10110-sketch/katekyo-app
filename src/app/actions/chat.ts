'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function sendMessage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const roomId = formData.get('room_id') as string
  const content = (formData.get('content') as string).trim()
  if (!content) return { error: 'メッセージを入力してください' }

  const { error } = await supabase.from('chat_messages').insert({
    room_id: roomId,
    sender_id: user.id,
    content,
  })

  if (error) return { error: error.message }
  revalidatePath('/chat')
  return { success: true }
}

export async function createChatRoom(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const roomType = formData.get('room_type') as 'teacher_student' | 'teacher_parent'
  const targetId = formData.get('target_id') as string

  const roomData = roomType === 'teacher_student'
    ? { teacher_id: user.id, student_id: targetId, parent_id: null }
    : { teacher_id: user.id, parent_id: targetId, student_id: null }

  // 既存ルームを確認
  const existingQuery = supabase
    .from('chat_rooms')
    .select('id')
    .eq('teacher_id', user.id)
    .eq('room_type', roomType)

  const { data: existing } = await (roomType === 'teacher_student'
    ? existingQuery.eq('student_id', targetId)
    : existingQuery.eq('parent_id', targetId)).single()

  if (existing) {
    revalidatePath('/chat')
    return { success: true, roomId: existing.id }
  }

  const { data: room, error } = await supabase
    .from('chat_rooms')
    .insert({ room_type: roomType, ...roomData })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/chat')
  return { success: true, roomId: room.id }
}
