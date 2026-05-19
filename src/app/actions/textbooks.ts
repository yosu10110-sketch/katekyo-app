'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase.from('textbooks').insert({
    teacher_id: user.id,
    subject: formData.get('subject') as string,
    title: formData.get('title') as string,
    publisher: (formData.get('publisher') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/textbooks')
  return { success: true }
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
