'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createLecture(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const scheduledEndAtRaw = formData.get('scheduled_end_at') as string
  const { error } = await supabase.from('lectures').insert({
    teacher_id: user.id,
    student_id: formData.get('student_id') as string,
    title: formData.get('title') as string,
    scheduled_at: new Date(formData.get('scheduled_at') as string).toISOString(),
    scheduled_end_at: scheduledEndAtRaw ? new Date(scheduledEndAtRaw).toISOString() : null,
    meeting_url: (formData.get('meeting_url') as string) || null,
    preparation_notes: (formData.get('preparation_notes') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateLecture(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const lectureId = formData.get('lecture_id') as string

  const scheduledEndAtRaw = formData.get('scheduled_end_at') as string
  const { error } = await supabase
    .from('lectures')
    .update({
      title: formData.get('title') as string,
      scheduled_at: new Date(formData.get('scheduled_at') as string).toISOString(),
      scheduled_end_at: scheduledEndAtRaw ? new Date(scheduledEndAtRaw).toISOString() : null,
      meeting_url: (formData.get('meeting_url') as string) || null,
      preparation_notes: (formData.get('preparation_notes') as string) || null,
    })
    .eq('id', lectureId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function completeLecture(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const lectureId = formData.get('lecture_id') as string
  const feeRaw = formData.get('fee') as string
  const durationRaw = formData.get('duration_minutes') as string

  const { error } = await supabase
    .from('lectures')
    .update({
      status: 'completed',
      teacher_comment: (formData.get('teacher_comment') as string) || null,
      homework: (formData.get('homework') as string) || null,
      fee: feeRaw ? parseInt(feeRaw) : null,
      duration_minutes: durationRaw ? parseInt(durationRaw) : null,
    })
    .eq('id', lectureId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  revalidatePath('/billing')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function cancelLecture(lectureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('lectures')
    .update({ status: 'cancelled' })
    .eq('id', lectureId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  revalidatePath('/billing')
  return { success: true }
}

export async function createBulkLectures(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const studentIds = formData.getAll('student_ids') as string[]
  if (!studentIds.length) return { error: '生徒を選択してください' }

  const scheduledEndAtRaw = formData.get('scheduled_end_at') as string
  const lectures = studentIds.map((studentId) => ({
    teacher_id: user.id,
    student_id: studentId,
    title: formData.get('title') as string,
    scheduled_at: new Date(formData.get('scheduled_at') as string).toISOString(),
    scheduled_end_at: scheduledEndAtRaw ? new Date(scheduledEndAtRaw).toISOString() : null,
    meeting_url: (formData.get('meeting_url') as string) || null,
    preparation_notes: (formData.get('preparation_notes') as string) || null,
  }))

  const { error } = await supabase.from('lectures').insert(lectures)
  if (error) return { error: error.message }
  revalidatePath('/lectures')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteLecture(lectureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('lectures')
    .delete()
    .eq('id', lectureId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/lectures')
  revalidatePath('/dashboard')
  return { success: true }
}
