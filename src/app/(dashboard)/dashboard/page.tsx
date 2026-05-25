import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Calendar, ChevronRight, Users, MessageSquare, BarChart3, UserPlus } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types'
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')
  const { role } = profile

  const supabase = await createClient()

  // ========== 教師：生徒一覧を表示 ==========
  if (role === 'teacher') {
    const { data: rels } = await supabase
      .from('teacher_student_relationships')
      .select('student_id, profiles!teacher_student_relationships_student_id_fkey(id, full_name)')
      .eq('teacher_id', user.id)

    const students = rels?.map((r) => r.profiles as unknown as Profile).filter(Boolean) ?? []

    const studentIds = students.map((s) => s.id)
    const pendingMap: Record<string, number> = {}
    if (studentIds.length > 0) {
      const { data: pending } = await supabase
        .from('assignments')
        .select('student_id')
        .eq('teacher_id', user.id)
        .eq('status', 'pending')
        .in('student_id', studentIds)
      pending?.forEach((a) => {
        pendingMap[a.student_id] = (pendingMap[a.student_id] ?? 0) + 1
      })
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">担当生徒</h2>
            <p className="text-gray-500 text-sm mt-1">生徒を選んで管理を始めましょう</p>
          </div>
          <AddStudentDialog />
        </div>

        {students.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">担当生徒がいません</p>
              <p className="text-gray-400 text-sm mt-1">
                <Link href="/relationships" className="text-indigo-600 hover:underline">メンバー管理</Link>
                から生徒を追加してください
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {students.map((student) => {
              const pending = pendingMap[student.id] ?? 0
              return (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-5">
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-lg font-bold shrink-0">
                        {student.full_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{student.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {pending > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              未提出 {pending}件
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">課題なし</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ========== 保護者：生徒未連携チェック ==========
  if (role === 'parent') {
    const { data: rels } = await supabase
      .from('parent_student_relationships')
      .select('student_id, profiles!parent_student_relationships_student_id_fkey(full_name)')
      .eq('parent_id', user.id)

    if (!rels || rels.length === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              おかえりなさい、{profile.full_name} さん
            </h2>
            <p className="text-gray-500 text-sm mt-1">まずお子さんのアカウントと連携しましょう</p>
          </div>
          <Link href="/relationships">
            <Card className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <UserPlus className="h-7 w-7 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">お子さんを登録する</p>
                  <p className="text-sm text-gray-500 mt-1">
                    生徒アカウントと紐付けると、講義予定・宿題・月謝を確認できます
                  </p>
                </div>
                <span className="text-sm text-indigo-600 font-medium">設定する →</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      )
    }
  }

  // ========== 生徒・保護者：ダッシュボード ==========
  let pendingAssignments = 0
  let lecture: { title: string } | undefined

  if (role === 'student') {
    const [pendingResult, lectureResult] = await Promise.all([
      supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('lectures')
        .select('*')
        .eq('student_id', user.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(1),
    ])
    pendingAssignments = pendingResult.count ?? 0
    lecture = lectureResult.data?.[0]
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          おかえりなさい、{profile.full_name} さん
        </h2>
        <p className="text-gray-500 text-sm mt-1">今日の状況をチェックしましょう</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/assignments">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <ClipboardList className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">未提出の課題</p>
                <p className="text-2xl font-bold text-gray-900">{pendingAssignments}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/lectures">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">次回講義</p>
                {lecture ? (
                  <p className="font-semibold text-gray-900 truncate">{lecture.title}</p>
                ) : (
                  <p className="text-sm text-gray-400">予定なし</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </CardContent>
          </Card>
        </Link>

        {role === 'parent' && (
          <Link href="/notice-board">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="p-2.5 bg-amber-50 rounded-xl">
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500">連絡板</p>
                  <p className="text-sm text-gray-600">保護者との連絡</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/curriculum">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-5">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-500">教材進捗</p>
                <p className="text-sm text-gray-600">カリキュラムの進み具合</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
