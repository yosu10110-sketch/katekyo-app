'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createMaterial(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('curriculum_materials')
    .insert({
      teacher_id: user.id,
      student_id: formData.get('student_id') as string,
      subject: formData.get('subject') as string,
      title: formData.get('title') as string,
      total_units: 0,
    })

  if (error) return { error: error.message }
  revalidatePath('/curriculum')
  return { success: true }
}

export async function updateCurriculumImages(materialId: string, images: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('curriculum_materials')
    .update({ images })
    .eq('id', materialId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/curriculum')
  return { success: true }
}

export async function setCurrentPage(materialId: string, page: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('curriculum_materials')
    .update({ current_page: page })
    .eq('id', materialId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/curriculum')
  return { success: true }
}

export async function deleteMaterial(materialId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('curriculum_materials')
    .delete()
    .eq('id', materialId)
    .eq('teacher_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/curriculum')
  return { success: true }
}
