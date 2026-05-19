'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createMaterial(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const totalUnits = parseInt(formData.get('total_units') as string, 10)
  const unitTitles = (formData.get('unit_titles') as string)
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)

  const { data: material, error } = await supabase
    .from('curriculum_materials')
    .insert({
      teacher_id: user.id,
      student_id: formData.get('student_id') as string,
      subject: formData.get('subject') as string,
      title: formData.get('title') as string,
      total_units: totalUnits,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // 単元を一括挿入
  const units = unitTitles.slice(0, totalUnits).map((title, i) => ({
    material_id: material.id,
    unit_number: i + 1,
    unit_title: title || `第${i + 1}単元`,
    is_completed: false,
  }))

  if (units.length > 0) {
    const { error: unitError } = await supabase.from('curriculum_units').insert(units)
    if (unitError) return { error: unitError.message }
  }

  revalidatePath('/curriculum')
  return { success: true }
}

export async function toggleUnit(unitId: string, isCompleted: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('curriculum_units')
    .update({
      is_completed: !isCompleted,
      completed_at: !isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', unitId)

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
