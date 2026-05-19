'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function searchProfiles(name: string, role: 'student' | 'teacher' | 'parent') {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', role)
    .ilike('full_name', `%${name}%`)
    .limit(10)

  if (error) return { error: error.message }
  return { data }
}

export async function addTeacherStudentRelationship(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログインです' }

  const { error } = await supabase
    .from('teacher_student_relationships')
    .insert({ teacher_id: user.id, student_id: studentId })

  if (error) {
    if (error.code === '23505') return { error: 'すでに登録済みです' }
    return { error: error.message }
  }

  revalidatePath('/relationships')
  return { success: true }
}

export async function addParentStudentRelationship(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログインです' }

  const { error } = await supabase
    .from('parent_student_relationships')
    .insert({ parent_id: user.id, student_id: studentId })

  if (error) {
    if (error.code === '23505') return { error: 'すでに登録済みです' }
    return { error: error.message }
  }

  revalidatePath('/relationships')
  return { success: true }
}

export async function removeTeacherStudentRelationship(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログインです' }

  const { error } = await supabase
    .from('teacher_student_relationships')
    .delete()
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)

  if (error) return { error: error.message }
  revalidatePath('/relationships')
  return { success: true }
}

export async function removeParentStudentRelationship(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログインです' }

  const { error } = await supabase
    .from('parent_student_relationships')
    .delete()
    .eq('parent_id', user.id)
    .eq('student_id', studentId)

  if (error) return { error: error.message }
  revalidatePath('/relationships')
  return { success: true }
}

export async function getMyRelationships() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未ログインです' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'プロフィールが見つかりません' }

  if (profile.role === 'teacher') {
    const { data } = await supabase
      .from('teacher_student_relationships')
      .select('student_id, profiles!teacher_student_relationships_student_id_fkey(id, full_name, role)')
      .eq('teacher_id', user.id)
    return { data: data ?? [], role: 'teacher' as const }
  }

  if (profile.role === 'parent') {
    const { data } = await supabase
      .from('parent_student_relationships')
      .select('student_id, profiles!parent_student_relationships_student_id_fkey(id, full_name, role)')
      .eq('parent_id', user.id)
    return { data: data ?? [], role: 'parent' as const }
  }

  // student: 自分の先生・保護者を表示
  const [teacherRes, parentRes] = await Promise.all([
    supabase
      .from('teacher_student_relationships')
      .select('teacher_id, profiles!teacher_student_relationships_teacher_id_fkey(id, full_name, role)')
      .eq('student_id', user.id),
    supabase
      .from('parent_student_relationships')
      .select('parent_id, profiles!parent_student_relationships_parent_id_fkey(id, full_name, role)')
      .eq('student_id', user.id),
  ])
  return {
    teachers: teacherRes.data ?? [],
    parents: parentRes.data ?? [],
    role: 'student' as const,
  }
}
