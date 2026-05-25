'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createLectureRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const teacherId = formData.get('teacher_id') as string
  const requestType = (formData.get('request_type') as string) || 'datetime'
  const desiredDate = formData.get('desired_date') as string
  const startTime = formData.get('start_time') as string | null
  const endTime = formData.get('end_time') as string | null
  const notes = formData.get('notes') as string

  if (!teacherId) return { error: '教師が見つかりません' }
  if (!desiredDate) return { error: '日付を入力してください' }

  // desired_at はスケジュール登録に使用（常に設定する）
  let desiredAt: string
  if (requestType === 'allday') {
    desiredAt = new Date(`${desiredDate}T12:00:00`).toISOString()
  } else if (startTime) {
    desiredAt = new Date(`${desiredDate}T${startTime}:00`).toISOString()
  } else {
    return { error: '時刻を入力してください' }
  }

  const { error } = await supabase.from('lecture_requests').insert({
    student_id: user.id,
    teacher_id: teacherId,
    desired_at: desiredAt,
    request_type: requestType,
    desired_date: desiredDate,
    start_time: startTime || null,
    end_time: endTime || null,
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

  const { data: req } = await supabase
    .from('lecture_requests')
    .select('*')
    .eq('id', requestId)
    .eq('teacher_id', user.id)
    .single()

  if (!req) return { error: 'リクエストが見つかりません' }

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

export function formatLectureRequest(req: {
  request_type?: string | null
  desired_at?: string | null
  desired_date?: string | null
  start_time?: string | null
  end_time?: string | null
}) {
  const type = req.request_type || 'datetime'

  if (type === 'allday' && req.desired_date) {
    const date = new Date(`${req.desired_date}T12:00:00`)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    }) + '（終日）'
  }

  if (type === 'timerange' && req.desired_date) {
    const date = new Date(`${req.desired_date}T12:00:00`)
    const dateStr = date.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    })
    return `${dateStr} ${req.start_time ?? '?'}〜${req.end_time ?? '?'}`
  }

  if (req.desired_at) {
    return new Date(req.desired_at).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric',
      weekday: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return '日時未設定'
}
