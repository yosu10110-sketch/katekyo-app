import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const target = searchParams.get('target') // "teacher_student:uuid" or "teacher_parent:uuid"

  if (!target) return NextResponse.redirect(`${origin}/chat`)

  const [roomType, targetId] = target.split(':') as ['teacher_student' | 'teacher_parent', string]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const roomData = roomType === 'teacher_student'
    ? { teacher_id: user.id, student_id: targetId, parent_id: null as null }
    : { teacher_id: user.id, parent_id: targetId, student_id: null as null }

  // 既存チェック
  const existingQ = supabase.from('chat_rooms').select('id').eq('teacher_id', user.id).eq('room_type', roomType)
  const { data: existing } = await (roomType === 'teacher_student'
    ? existingQ.eq('student_id', targetId)
    : existingQ.eq('parent_id', targetId)).single()

  if (existing) {
    return NextResponse.redirect(`${origin}/chat?room=${existing.id}`)
  }

  const { data: room, error } = await supabase
    .from('chat_rooms')
    .insert({ room_type: roomType, ...roomData })
    .select()
    .single()

  if (error || !room) return NextResponse.redirect(`${origin}/chat`)
  return NextResponse.redirect(`${origin}/chat?room=${room.id}`)
}
