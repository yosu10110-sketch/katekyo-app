'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createLectureRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const teacherId = formData.get('teacher_id') as string
  const desiredAt = formData.get('desired_at') as string
  const notes = formData.get('notes') as string

  if (!teacherId) return { error: '教師が見つかりません' }

  const { error } = await supabase.from('lecture_requests').insert({
    student_id: user.id,
    teacher_id: teacherId,
    desired_at: new Date(desiredAt).toISOString(),
    notes: notes || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  return { success: true }
}

export async function approveLectureRequest(requestId: string, meetingUrl?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  // リクエスト取得
  const { data: req } = await supabase
    .from('lecture_requests')
    .select('*')
    .eq('id', requestId)
    .eq('teacher_id', user.id)
    .single()

  if (!req) return { error: 'リクエストが見つかりません' }

  // 承認 → lecturesに追加
  const { error: lectureError } = await supabase.from('lectures').insert({
    teacher_id: user.id,
    student_id: req.student_id,
    title: '講義',
    scheduled_at: req.desired_at,
    meeting_url: meetingUrl || null,
    preparation_notes: req.notes || null,
  })
  if (lectureError) return { error: lectureError.message }

  const { error } = await supabase
    .from('lecture_requests')
    .update({ status: 'approved' })
    .eq('id', requestId)

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  return { success: true }
}

export async function rejectLectureRequest(requestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('lecture_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  return { success: true }
}
