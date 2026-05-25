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

export async function approveLectureRequest(
  requestId: string,
  meetingUrl?: string,
  scheduledStartTime?: string,
  scheduledEndTime?: string,
) {
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

  // timerange/alldayの場合、教師が指定した時刻でscheduled_atを上書き
  let scheduledAt = req.desired_at
  let scheduledEndAt: string | null = null
  if (scheduledStartTime && req.desired_date) {
    scheduledAt = new Date(`${req.desired_date}T${scheduledStartTime}:00`).toISOString()
  }
  if (scheduledEndTime && req.desired_date) {
    scheduledEndAt = new Date(`${req.desired_date}T${scheduledEndTime}:00`).toISOString()
  }

  const { error: lectureError } = await supabase.from('lectures').insert({
    teacher_id: user.id,
    student_id: req.student_id,
    title: '講義',
    scheduled_at: scheduledAt,
    scheduled_end_at: scheduledEndAt,
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

