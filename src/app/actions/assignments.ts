'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createAssignment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase.from('assignments').insert({
    teacher_id: user.id,
    student_id: formData.get('student_id') as string,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    due_date: formData.get('due_date') ? new Date(formData.get('due_date') as string).toISOString() : null,
    textbook_id: (formData.get('textbook_id') as string) || null,
    page_range: (formData.get('page_range') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/assignments')
  return { success: true }
}

export async function submitAssignment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const assignmentId = formData.get('assignment_id') as string
  const fileUrl = formData.get('file_url') as string
  const fileType = formData.get('file_type') as string

  const { error: insertError } = await supabase.from('assignment_submissions').insert({
    assignment_id: assignmentId,
    student_id: user.id,
    file_url: fileUrl,
    file_type: fileType,
  })

  if (insertError) return { error: insertError.message }

  const { error: updateError } = await supabase
    .from('assignments')
    .update({ status: 'submitted' })
    .eq('id', assignmentId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/assignments/${assignmentId}`)
  revalidatePath('/assignments')
  return { success: true }
}

export async function saveFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const submissionId = formData.get('submission_id') as string
  const assignmentId = formData.get('assignment_id') as string
  const feedbackComment = formData.get('feedback_comment') as string

  const feedbackFileUrl = formData.get('feedback_file_url') as string | null
  const feedbackFileType = formData.get('feedback_file_type') as string | null

  const { error: fbError } = await supabase
    .from('assignment_submissions')
    .update({
      feedback_comment: feedbackComment || null,
      feedback_at: new Date().toISOString(),
      ...(feedbackFileUrl && { feedback_file_url: feedbackFileUrl }),
      ...(feedbackFileType && { feedback_file_type: feedbackFileType }),
    })
    .eq('id', submissionId)

  if (fbError) return { error: fbError.message }

  const { error: statusError } = await supabase
    .from('assignments')
    .update({ status: 'reviewed' })
    .eq('id', assignmentId)

  if (statusError) return { error: statusError.message }

  revalidatePath(`/assignments/${assignmentId}`)
  revalidatePath('/assignments')
  return { success: true }
}

export async function deleteAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/assignments')
  return { success: true }
}
