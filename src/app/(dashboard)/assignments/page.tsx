import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CreateAssignmentDialog } from '@/components/assignments/create-assignment-dialog'
import { ClipboardList, ChevronRight, Clock, CheckCircle2, Circle } from 'lucide-react'
import type { Profile, Assignment, Textbook } from '@/types'
import { WeeklyCalendar } from '@/components/assignments/weekly-calendar'
import { StreakDisplay } from '@/components/gamification/streak-display'
import { BadgeCollection } from '@/components/gamification/badge-collection'
import { getStudentStreak, getStudentBadges, getGamificationSetting, checkAndAwardBadges } from '@/app/actions/gamification'

const statusConfig = {
  pending: { label: '未提出', icon: Circle, className: 'bg-gray-100 text-gray-600' },
  submitted: { label: '提出済み・採点待ち', icon: Clock, className: 'bg-amber-100 text-amber-700' },
  reviewed: { label: 'フィードバック済み', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
}

function formatDueDate(due: string | null) {
  if (!due) return null
  const date = new Date(due)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  const label = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (days < 0) return { label, urgent: true, text: '期限切れ' }
  if (days <= 2) return { label, urgent: true, text: `残り${days}日` }
  return { label, urgent: false, text: `残り${days}日` }
}

// 提出済み・FB済み用：期限切れ表示なし（提出日を表示）
function formatDueDateNoOverdue(due: string | null) {
  if (!due) return null
  const date = new Date(due)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  const label = date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (days >= 0 && days <= 2) return { label, urgent: false, text: `期限: ${label}` }
  if (days < 0) return { label, urgent: false, text: `期限: ${label}` }
  return { label, urgent: false, text: `期限: ${label}` }
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const { role } = profile as Profile

  // 課題一覧を取得（ロール別）
  let assignmentsQuery = supabase
    .from('assignments')
    .select('*, profiles!assignments_student_id_fkey(full_name), assignment_submissions(submitted_at)')
    .order('created_at', { ascending: false })

  if (role === 'teacher') {
    assignmentsQuery = assignmentsQuery.eq('teacher_id', user.id)
    if (studentFilter) assignmentsQuery = assignmentsQuery.eq('student_id', studentFilter)
  } else if (role === 'student') {
    assignmentsQuery = assignmentsQuery.eq('student_id', user.id)
  } else {
    // parent: 子供の課題を取得
    const { data: rel } = await supabase
      .from('parent_student_relationships')
      .select('student_id')
      .eq('parent_id', user.id)
    const studentIds = rel?.map((r) => r.student_id) ?? []
    if (studentIds.length === 0) {
      return <EmptyState role={role} students={[]} textbooks={[]} />
    }
    assignmentsQuery = assignmentsQuery.in('student_id', studentIds)
  }

  const { data: assignments } = await assignmentsQuery

  // 生徒の場合：ゲーミフィケーション情報を取得
  let streak = { current: 0, longest: 0 }
  let badges: any[] = []
  let gamificationEnabled = true
  if (role === 'student') {
    await checkAndAwardBadges(user.id)
    const [s, b, g] = await Promise.all([
      getStudentStreak(user.id),
      getStudentBadges(user.id),
      getGamificationSetting(user.id),
    ])
    streak = s
    badges = b
    gamificationEnabled = g
  }

  // 教師の場合：担当生徒・参考書一覧も取得（課題作成用）
  let students: Profile[] = []
  let textbooks: Textbook[] = []
  if (role === 'teacher') {
    const relsRes = await supabase
      .from('teacher_student_relationships')
      .select('profiles!teacher_student_relationships_student_id_fkey(*)')
      .eq('teacher_id', user.id)
    students = relsRes.data?.map((r) => r.profiles as unknown as Profile).filter(Boolean) ?? []

    // 生徒が絞られている場合はその生徒の参考書のみ取得
    if (studentFilter) {
      const { data: tb } = await supabase
        .from('textbooks')
        .select('*')
        .eq('teacher_id', user.id)
        .eq('student_id', studentFilter)
        .order('subject')
      textbooks = (tb ?? []) as Textbook[]
    }
  }

  const preSelectedStudent = studentFilter
    ? students.find((s) => s.id === studentFilter)
    : undefined

  // 生徒：週間カレンダー表示
  if (role === 'student') {
    return (
      <div className="space-y-6 max-w-2xl">
        {gamificationEnabled && (
          <>
            <StreakDisplay current={streak.current} longest={streak.longest} />
            <BadgeCollection earnedBadges={badges} />
          </>
        )}
        <WeeklyCalendar assignments={(assignments ?? []) as Assignment[]} />
      </div>
    )
  }

  if (!assignments || assignments.length === 0) {
    return <EmptyState role={role} students={students} textbooks={textbooks} preSelectedStudent={preSelectedStudent} />
  }

  // ステータスごとにグループ化
  const grouped = {
    submitted: assignments.filter((a) => a.status === 'submitted'),
    pending: assignments.filter((a) => a.status === 'pending'),
    reviewed: assignments.filter((a) => a.status === 'reviewed'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {role === 'teacher' ? `全${assignments.length}件` : `${assignments.length}件の課題`}
          </p>
        </div>
        {role === 'teacher' && <CreateAssignmentDialog students={students} textbooks={textbooks} preSelectedStudent={preSelectedStudent} />}
      </div>

      {/* 提出済み・要採点（教師向けに先頭表示） */}
      {grouped.submitted.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {role === 'teacher' ? '採点待ち' : '提出済み・採点待ち'}
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
              {grouped.submitted.length}
            </span>
          </h2>
          <AssignmentList assignments={grouped.submitted} role={role} />
        </section>
      )}

      {grouped.pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Circle className="h-4 w-4" />
            未提出
            <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
              {grouped.pending.length}
            </span>
          </h2>
          <AssignmentList assignments={grouped.pending} role={role} />
        </section>
      )}

      {grouped.reviewed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            フィードバック済み
            <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
              {grouped.reviewed.length}
            </span>
          </h2>
          <AssignmentList assignments={grouped.reviewed} role={role} />
        </section>
      )}
    </div>
  )
}

function AssignmentList({ assignments, role }: { assignments: Assignment[]; role: string }) {
  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const status = statusConfig[assignment.status]
        const due = assignment.status === 'pending' ? formatDueDate(assignment.due_date) : null
        const submittedAt = (assignment as any).assignment_submissions?.[0]?.submitted_at
        const studentName = (assignment as Assignment & { profiles?: { full_name: string } }).profiles?.full_name

        return (
          <Link key={assignment.id} href={`/assignments/${assignment.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <status.icon className={`h-5 w-5 mt-0.5 shrink-0 ${
                    assignment.status === 'pending' ? 'text-gray-400' :
                    assignment.status === 'submitted' ? 'text-amber-500' : 'text-green-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{assignment.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {role === 'teacher' && studentName && (
                        <span className="text-xs text-gray-500">{studentName}</span>
                      )}
                      <Badge variant="outline" className={`text-xs ${status.className}`}>
                        {status.label}
                      </Badge>
                      {due && (
                        <span className={`text-xs ${due.urgent ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {due.label}（{due.text}）
                        </span>
                      )}
                      {submittedAt && assignment.status !== 'pending' && (
                        <span className="text-xs text-gray-400">
                          {new Date(submittedAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 提出
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function EmptyState({ role, students, textbooks, preSelectedStudent }: { role: string; students: Profile[]; textbooks: Textbook[]; preSelectedStudent?: Profile }) {
  return (
    <div className="space-y-4">
      {role === 'teacher' && (
        <div className="flex justify-end">
          <CreateAssignmentDialog students={students} textbooks={textbooks} preSelectedStudent={preSelectedStudent} />
        </div>
      )}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ClipboardList className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">課題はまだありません</p>
        <p className="text-gray-400 text-sm mt-1">
          {role === 'teacher' ? '「課題を作成」ボタンから課題を追加できます' : '教師からの課題が届くとここに表示されます'}
        </p>
      </div>
    </div>
  )
}
