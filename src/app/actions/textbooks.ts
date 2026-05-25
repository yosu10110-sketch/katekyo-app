'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// 特定生徒の参考書を取得
export async function getTextbooksForStudent(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('textbooks')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .order('subject')

  return data ?? []
}

export async function getMyTextbooks() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('textbooks')
    .select('*')
    .eq('teacher_id', user.id)
    .order('subject')

  return data ?? []
}

export async function createTextbook(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const studentId = formData.get('student_id') as string | null

  const { data, error } = await supabase.from('textbooks').insert({
    teacher_id: user.id,
    student_id: studentId || null,
    subject: formData.get('subject') as string,
    title: formData.get('title') as string,
    publisher: (formData.get('publisher') as string) || null,
    grade: (formData.get('grade') as string) || null,
  }).select().single()

  if (error) return { error: error.message }
  revalidatePath('/textbooks')
  return { success: true, textbook: data }
}

export async function deleteTextbook(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('textbooks')
    .delete()
    .eq('id', id)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/textbooks')
  return { success: true }
}
