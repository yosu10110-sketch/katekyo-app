import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LectureDialog } from '@/components/lectures/lecture-dialog'
import { RequestLectureDialog } from '@/components/lectures/request-lecture-dialog'
import { ApproveRequestCard } from '@/components/lectures/approve-request-card'
import { Calendar, Video, ClipboardCheck, CalendarX, CalendarClock } from 'lucide-react'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const { role } = profile as Profile

  // 講義一覧取得
  let lecturesQuery = supabase
    .from('lectures')
    .select('*, profiles!lectures_student_id_fkey(full_name)')
    .order('scheduled_at', { ascending: true })

  if (role === 'teacher') {
    lecturesQuery = lecturesQuery.eq('teacher_id', user.id)
    if (studentFilter) lecturesQuery = lecturesQuery.eq('student_id', studentFilter)
  } else if (role === 'student') {
    lecturesQuery = lecturesQuery.eq('student_id', user.id)
  } else {
    const { data: rel } = await supabase
      .from('parent_student_relationships')
      .select('student_id').eq('parent_id', user.id)
    const ids = rel?.map((r) => r.student_id) ?? []
    if (ids.length > 0) lecturesQuery = lecturesQuery.in('student_id', ids)
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

  const upcoming = lectures?.filter((l) => isUpcoming(l.scheduled_at)) ?? []
  const past = lectures?.filter((l) => !isUpcoming(l.scheduled_at)) ?? []

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
                        {new Date(req.desired_at).toLocaleDateString('ja-JP', {
                          month: 'long', day: 'numeric', weekday: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
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

      {/* 講義一覧 */}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CalendarX className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">講義の予定はありません</p>
          <p className="text-gray-400 text-sm mt-1">
            {role === 'teacher' ? '「講義を追加」から登録できます' : '「講義を申請する」から希望日時を送れます'}
          </p>
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
                    lecture={lecture as Lecture & { profiles?: { full_name: string } }}
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
                <Calendar className="h-4 w-4" />
                過去の講義
              </h2>
              <div className="space-y-3 opacity-60">
                {past.slice(0, 5).map((lecture) => (
                  <LectureCard
                    key={lecture.id}
                    lecture={lecture as Lecture & { profiles?: { full_name: string } }}
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
    </div>
  )
}

function LectureCard({
  lecture, role, students, isUpcoming,
}: {
  lecture: Lecture & { profiles?: { full_name: string } }
  role: string
  students: Profile[]
  isUpcoming: boolean
}) {
  return (
    <Card className={isUpcoming ? 'border-green-200 bg-green-50/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base">{lecture.title}</CardTitle>
            {role === 'teacher' && lecture.profiles && (
              <p className="text-xs text-gray-500 mt-0.5">{lecture.profiles.full_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isUpcoming && <Badge className="bg-green-100 text-green-700 text-xs">upcoming</Badge>}
            {role === 'teacher' && <LectureDialog students={students} lecture={lecture} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="h-4 w-4 text-green-500 shrink-0" />
          <span>{formatDate(lecture.scheduled_at)}</span>
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
      </CardContent>
    </Card>
  )
}
