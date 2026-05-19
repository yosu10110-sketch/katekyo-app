import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MaterialCard } from '@/components/curriculum/material-card'
import { CreateMaterialDialog } from '@/components/curriculum/create-material-dialog'
import { BarChart3 } from 'lucide-react'
import type { Profile, CurriculumMaterial, CurriculumUnit } from '@/types'

type MaterialWithUnits = CurriculumMaterial & {
  curriculum_units: CurriculumUnit[]
  profiles?: { full_name: string }
}

export default async function CurriculumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const { role } = profile as Profile

  let students: Profile[] = []
  let materialsQuery = supabase
    .from('curriculum_materials')
    .select('*, curriculum_units(*), profiles!curriculum_materials_student_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (role === 'teacher') {
    const { data: rels } = await supabase
      .from('teacher_student_relationships')
      .select('profiles!teacher_student_relationships_student_id_fkey(*), student_id')
      .eq('teacher_id', user.id)
    students = rels?.map((r) => r.profiles as unknown as Profile).filter(Boolean) ?? []
    const studentIds = rels?.map((r) => r.student_id) ?? []
    if (studentIds.length > 0) materialsQuery = materialsQuery.in('student_id', studentIds)
    materialsQuery = materialsQuery.eq('teacher_id', user.id)
  } else if (role === 'student') {
    materialsQuery = materialsQuery.eq('student_id', user.id)
  } else {
    const { data: rels } = await supabase
      .from('parent_student_relationships')
      .select('student_id')
      .eq('parent_id', user.id)
    const ids = rels?.map((r) => r.student_id) ?? []
    if (ids.length > 0) materialsQuery = materialsQuery.in('student_id', ids)
  }

  const { data: materials } = await materialsQuery

  return (
    <div className="space-y-6">
      {role === 'teacher' && (
        <div className="flex justify-end">
          <CreateMaterialDialog students={students} />
        </div>
      )}

      {!materials || materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">教材がまだ登録されていません</p>
          {role === 'teacher' && (
            <p className="text-gray-400 text-sm mt-1">「教材を追加」から登録できます</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(materials as MaterialWithUnits[]).map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              role={role}
              studentName={role === 'teacher' ? material.profiles?.full_name : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
