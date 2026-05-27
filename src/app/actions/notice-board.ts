'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const attachmentsRaw = formData.get('attachments') as string
  const attachments = attachmentsRaw ? JSON.parse(attachmentsRaw) : []

  const { error } = await supabase.from('notice_board_posts').insert({
    author_id: user.id,
    student_id: formData.get('student_id') as string,
    title: formData.get('title') as string,
    content: formData.get('content') as string,
    is_visible_to_student: formData.get('is_visible_to_student') === 'true',
    attachments,
  })

  if (error) return { error: error.message }
  revalidatePath('/notice-board')
  return { success: true }
}

export async function toggleVisibility(postId: string, current: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('notice_board_posts')
    .update({ is_visible_to_student: !current })
    .eq('id', postId)

  if (error) return { error: error.message }
  revalidatePath('/notice-board')
  return { success: true }
}

export async function createReply(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const attachmentsRaw = formData.get('attachments') as string
  const attachments = attachmentsRaw ? JSON.parse(attachmentsRaw) : []

  const { error } = await supabase.from('notice_board_replies').insert({
    post_id: formData.get('post_id') as string,
    author_id: user.id,
    content: formData.get('content') as string,
    attachments,
  })

  if (error) return { error: error.message }
  revalidatePath('/notice-board')
  return { success: true }
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('notice_board_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/notice-board')
  return { success: true }
}
