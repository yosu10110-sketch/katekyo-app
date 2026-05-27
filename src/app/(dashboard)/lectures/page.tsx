import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/supabase/cached'
import { formatLectureRequest } from '@/lib/lecture-utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LectureDialog } from '@/components/lectures/lecture-dialog'
import { RequestLectureDialog } from '@/components/lectures/request-lecture-dialog'
import { ApproveRequestCard } from '@/components/lectures/approve-request-card'
import { LectureCalendar } from '@/components/lectures/lecture-calendar'
import { CompleteSessionButton } from '@/components/lectures/complete-session-dialog'
import {
  Calendar, Video, ClipboardCheck, CalendarX, CalendarClock,
  CheckCircle2, MessageSquare, BookOpen, Clock,
} from 'lucide-react'
import type { Profile, Lecture } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  })
}

function isUpcoming(iso: string) {
  return new Date(iso) > new Date()
}

export default async function LecturesPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const { student: studentFilter } = await searchParams
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')
  const { role } = profile

  const supabase = await createClient()

  // 講義一覧取得
  let lecturesQuery = supabase
    .from('lectures')
    .select('*, profiles!lectures_student_id_fkey(full_name)')
    .order('scheduled_at', { ascending: true })

  let parentChildIds: string[] = []
  if (role === 'teacher') {
    lecturesQuery = lecturesQuery.eq('teacher_id', user.id)
    if (studentFilter) lecturesQuery = lecturesQuery.eq('student_id', studentFilter)
  } else if (role === 'student') {
    lecturesQuery = lecturesQuery.eq('student_id', user.id)
  } else {
    const { data: rel } = await supabase
      .from('parent_student_relationships')
      .select('student_id').eq('parent_id', user.id)
    parentChildIds = rel?.map((r) => r.student_id) ?? []
    if (parentChildIds.length > 0) lecturesQuery = lecturesQuery.in('student_id', parentChildIds)
  }

  const { data: lectures } = await lecturesQuery

  // 教師用：担当生徒一覧 + 申請一覧
  let students: Profile[] = []
  let pendingRequests: any[] = []
  if (role === 'teacher') {
    const [relsRes, reqRes] = await Promise.all([
      supabase
        .from('teacher_student_relationships')
        .select('profiles!teacher_student_relationships_student_id_fkey(*)')
        .eq('teacher_id', user.id),
      supabase
        .from('lecture_requests')
        .select('*, profiles!lecture_requests_student_id_fkey(full_name)')
        .eq('teacher_id', user.id)
        .eq('status', 'pending')
        .order('desired_at'),
    ])
    students = relsRes.data?.map((r) => r.profiles as unknown as Profile).filter(Boolean) ?? []
    pendingRequests = reqRes.data ?? []
    if (studentFilter) {
      pendingRequests = pendingRequests.filter((r) => r.student_id === studentFilter)
    }
  }

  // 保護者用：子供 + 担当教師の情報
  let parentChildren: { studentId: string; studentName: string; teacherId: string }[] = []
  if (role === 'parent' && parentChildIds.length > 0) {
    const [profilesRes, teacherRelsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', parentChildIds),
      supabase.from('teacher_student_relationships').select('student_id, teacher_id').in('student_id', parentChildIds),
    ])
    const childProfiles = profilesRes.data ?? []
    const childTeacherRels = teacherRelsRes.data ?? []
    parentChildren = parentChildIds.flatMap((childId) => {
      const profile = childProfiles.find((p) => p.id === childId)
      const teacherRel = childTeacherRels.find((t) => t.student_id === childId)
      if (!teacherRel) return []
      return [{ studentId: childId, studentName: profile?.full_name ?? '不明', teacherId: teacherRel.teacher_id }]
    })
  }

  // 生徒用：担当教師ID + 自分の申請履歴
  let teacherId: string | null = null
  let myRequests: any[] = []
  if (role === 'student') {
    const [teacherRes, reqRes] = await Promise.all([
      supabase
        .from('teacher_student_relationships')
        .select('teacher_id')
        .eq('student_id', user.id)
        .limit(1),
      supabase
        .from('lecture_requests')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])
    teacherId = teacherRes.data?.[0]?.teacher_id ?? null
    myRequests = reqRes.data ?? []
  }

  const allLectures = (lectures ?? []) as (Lecture & { profiles?: { full_name: string } })[]

  // 教師用：ステータス別に分類
  const scheduledLectures = allLectures.filter(
    (l) => !l.status || l.status === 'scheduled',
  )
  const completedLectures = [...allLectures.filter((l) => l.status === 'completed')].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  )

  // 生徒・保護者用
  const upcoming = allLectures.filter(
    (l) => isUpcoming(l.scheduled_at) && l.status !== 'cancelled' && l.status !== 'completed',
  )
  const past = allLectures.filter((l) => !upcoming.find((u) => u.id === l.id))

  const statusMap = {
    pending: { label: '承認待ち', className: 'bg-amber-100 text-amber-700' },
    approved: { label: '承認済み', className: 'bg-green-100 text-green-700' },
    rejected: { label: '却下', className: 'bg-gray-100 text-gray-500' },
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {role === 'teacher' && <LectureDialog students={students} />}
        {role === 'student' && teacherId && (
          <RequestLectureDialog teacherId={teacherId} />
        )}
        {role === 'parent' && parentChildren.length > 0 && (
          <RequestLectureDialog parentChildren={parentChildren} />
        )}
      </div>

      {/* 教師：申請一覧 */}
      {role === 'teacher' && pendingRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            講義申請
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <ApproveRequestCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      )}

      {/* 生徒：申請履歴 */}
      {role === 'student' && myRequests.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            申請履歴
          </h2>
          <div className="space-y-2">
            {myRequests.map((req) => {
              const s = statusMap[req.status as keyof typeof statusMap]
              return (
                <Card key={req.id} className={req.status === 'rejected' ? 'opacity-50' : ''}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatLectureRequest(req)}
                      </p>
                      {req.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{req.notes}</p>
                      )}
                    </div>
                    <Badge className={`text-xs shrink-0 ${s.className}`}>{s.label}</Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* 教師：カレンダー + リスト表示 */}
      {role === 'teacher' && (
        <>
          <LectureCalendar
            lectures={allLectures}
            role={role}
          />

          {/* 予定中の授業 */}
          {scheduledLectures.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-500" />
                予定中の授業
                <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                  {scheduledLectures.length}
                </span>
              </h2>
              <div className="space-y-3">
                {scheduledLectures.map((lecture) => (
                  <TeacherLectureCard key={lecture.id} lecture={lecture} students={students} />
                ))}
              </div>
            </section>
          )}

          {/* 完了した授業 */}
          {completedLectures.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                完了した授業
              </h2>
              <div className="space-y-3">
                {completedLectures.slice(0, 10).map((lecture) => (
                  <TeacherLectureCard key={lecture.id} lecture={lecture} students={students} />
                ))}
              </div>
            </section>
          )}

          {allLectures.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarX className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">講義の予定はありません</p>
              <p className="text-gray-400 text-sm mt-1">「講義を追加」から次回の授業を登録しましょう</p>
            </div>
          )}
        </>
      )}

      {/* 生徒・保護者：リスト表示 */}
      {role !== 'teacher' && (
        <>
          {upcoming.length === 0 && past.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarX className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">講義の予定はありません</p>
              <p className="text-gray-400 text-sm mt-1">「講義を申請する」から希望日時を送れます</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-green-500" />
                    今後の予定
                    <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                      {upcoming.length}
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {upcoming.map((lecture) => (
                      <LectureCard
                        key={lecture.id}
                        lecture={lecture}
                        role={role}
                        students={students}
                        isUpcoming
                      />
                    ))}
                  </div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />過去の講義
                  </h2>
                  <div className="space-y-3">
                    {past.slice(0, 10).map((lecture) => (
                      <LectureCard
                        key={lecture.id}
                        lecture={lecture}
                        role={role}
                        students={students}
                        isUpcoming={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// 教師用カード（完了ボタン付き）
function TeacherLectureCard({
  lecture,
  students,
}: {
  lecture: Lecture & { profiles?: { full_name: string } }
  students: Profile[]
}) {
  const isScheduled = !lecture.status || lecture.status === 'scheduled'
  const isCompleted = lecture.status === 'completed'
  const isCancelled = lecture.status === 'cancelled'

  return (
    <Card
      className={
        isCompleted
          ? 'border-green-200 bg-green-50/20'
          : isCancelled
          ? 'opacity-50 border-gray-200'
          : ''
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{lecture.title}</CardTitle>
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-xs shrink-0">完了</Badge>
              )}
              {isCancelled && (
                <Badge className="bg-gray-100 text-gray-500 text-xs shrink-0">キャンセル</Badge>
              )}
            </div>
            {lecture.profiles && (
              <p className="text-xs text-gray-500 mt-0.5">{lecture.profiles.full_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isScheduled && <CompleteSessionButton lecture={lecture} />}
            <LectureDialog students={students} lecture={lecture} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <span>
            {formatDate(lecture.scheduled_at)}
            {lecture.scheduled_end_at && (
              <span className="text-gray-400">
                {' 〜 '}
                {new Date(lecture.scheduled_end_at).toLocaleTimeString('ja-JP', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </span>
        </div>
        {lecture.meeting_url && (
          <a
            href={lecture.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 w-fit"
          >
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span className="underline underline-offset-2">Zoomで参加する</span>
          </a>
        )}
        {isCompleted && (
          <div className="space-y-2 pt-1">
            {lecture.teacher_comment && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MessageSquare className="h-3 w-3 text-blue-500" />
                  <p className="text-xs font-semibold text-blue-700">保護者コメント</p>
                </div>
                <p className="text-sm text-blue-800">{lecture.teacher_comment}</p>
              </div>
            )}
            {lecture.homework && (
              <div className="bg-amber-50 border border-amber-100 rounded-md p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <BookOpen className="h-3 w-3 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700">宿題</p>
                </div>
                <p className="text-sm text-amber-800">{lecture.homework}</p>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-0.5">
              {lecture.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lecture.duration_minutes}分
                </span>
              )}
              {lecture.fee != null && (
                <span className="font-semibold text-indigo-700">
                  ¥{lecture.fee.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 生徒・保護者用カード
function LectureCard({
  lecture, role, students, isUpcoming,
}: {
  lecture: Lecture & { profiles?: { full_name: string } }
  role: string
  students: Profile[]
  isUpcoming: boolean
}) {
  const isCompleted = lecture.status === 'completed'
  const isCancelled = lecture.status === 'cancelled'

  return (
    <Card
      className={
        isUpcoming
          ? 'border-green-200 bg-green-50/30'
          : isCancelled
          ? 'opacity-40'
          : ''
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{lecture.title}</CardTitle>
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-xs shrink-0">完了</Badge>
              )}
              {isCancelled && (
                <Badge className="bg-gray-100 text-gray-400 text-xs shrink-0">キャンセル</Badge>
              )}
              {isUpcoming && !isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-xs shrink-0">upcoming</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="h-4 w-4 text-green-500 shrink-0" />
          <span>
            {formatDate(lecture.scheduled_at)}
            {lecture.scheduled_end_at && (
              <span className="text-gray-500">
                {' 〜 '}
                {new Date(lecture.scheduled_end_at).toLocaleTimeString('ja-JP', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </span>
        </div>
        {lecture.meeting_url && (
          <a
            href={lecture.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 w-fit"
          >
            <Video className="h-4 w-4 shrink-0" />
            <span className="underline underline-offset-2">Zoomで参加する</span>
          </a>
        )}
        {lecture.preparation_notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs font-semibold text-amber-700">準備する持ち物・事項</p>
            </div>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{lecture.preparation_notes}</p>
          </div>
        )}
        {/* 完了した授業：先生からのレポート */}
        {isCompleted && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            {lecture.teacher_comment && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  <p className="text-xs font-semibold text-blue-700">先生からのコメント</p>
                </div>
                <p className="text-sm text-blue-800">{lecture.teacher_comment}</p>
              </div>
            )}
            {lecture.homework && (
              <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700">宿題・次回の準備</p>
                </div>
                <p className="text-sm text-amber-800">{lecture.homework}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
