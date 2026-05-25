import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Receipt, ChevronLeft, ChevronRight, Clock, BookOpen, MessageSquare } from 'lucide-react'
import Link from 'next/link'

function formatYen(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分`
  return m > 0 ? `${h}時間${m}分` : `${h}時間`
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  const user = await getUser()
  if (!user) redirect('/login')
  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')
  const { role } = profile

  if (role === 'student') redirect('/lectures')

  const supabase = await createClient()

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 1)

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1)

  // ===== 教師ビュー =====
  if (role === 'teacher') {
    const { data: lecturesRaw } = await supabase
      .from('lectures')
      .select('*, profiles!lectures_student_id_fkey(id, full_name)')
      .eq('teacher_id', user.id)
      .eq('status', 'completed')
      .gte('scheduled_at', startOfMonth.toISOString())
      .lt('scheduled_at', endOfMonth.toISOString())
      .order('scheduled_at', { ascending: false })

    const lectures = lecturesRaw ?? []

    type StudentSummary = {
      student: { id: string; full_name: string }
      sessions: typeof lectures
      totalFee: number
      totalMinutes: number
    }

    const byStudent: Record<string, StudentSummary> = {}
    let grandTotalFee = 0
    let grandTotalMinutes = 0

    for (const l of lectures) {
      const sId = l.student_id
      if (!byStudent[sId]) {
        byStudent[sId] = {
          student: (l.profiles as unknown as { id: string; full_name: string }) ?? {
            id: sId,
            full_name: '不明',
          },
          sessions: [],
          totalFee: 0,
          totalMinutes: 0,
        }
      }
      byStudent[sId].sessions.push(l)
      byStudent[sId].totalFee += l.fee ?? 0
      byStudent[sId].totalMinutes += l.duration_minutes ?? 0
      grandTotalFee += l.fee ?? 0
      grandTotalMinutes += l.duration_minutes ?? 0
    }

    const studentSummaries = Object.values(byStudent)

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">月謝管理</h2>
          <p className="text-gray-500 text-sm mt-1">完了した授業の指導料を確認できます</p>
        </div>

        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
          <Link
            href={`/billing?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="text-center">
            <p className="font-bold text-gray-900">
              {year}年{month}月
            </p>
            {isCurrentMonth && <p className="text-xs text-indigo-600">今月</p>}
          </div>
          <Link
            href={
              isFuture
                ? '#'
                : `/billing?year=${nextMonth.year}&month=${nextMonth.month}`
            }
            className={`p-1.5 rounded-lg transition-colors ${
              isFuture ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'
            }`}
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </Link>
        </div>

        {/* 月合計サマリー */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-medium text-indigo-600 mb-1">今月の合計指導料</p>
              <p className="text-2xl font-bold text-indigo-900">{formatYen(grandTotalFee)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4 px-5">
              <p className="text-xs font-medium text-green-600 mb-1">完了授業数 / 合計時間</p>
              <p className="text-xl font-bold text-green-900">
                {lectures.length}
                <span className="text-sm font-normal text-green-600 ml-1">回</span>
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                {grandTotalMinutes > 0 ? formatDuration(grandTotalMinutes) : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 生徒別内訳 */}
        {studentSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">この月の完了した授業はありません</p>
            <p className="text-gray-400 text-sm mt-1">
              授業完了後、指導料を記録すると集計されます
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">生徒別内訳</h3>
            {studentSummaries.map(({ student, sessions, totalFee, totalMinutes }) => (
              <Card key={student.id} className="overflow-hidden">
                <CardHeader className="pb-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold shrink-0">
                        {student.full_name[0]}
                      </div>
                      <CardTitle className="text-base">{student.full_name}</CardTitle>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-700">{formatYen(totalFee)}</p>
                      <p className="text-xs text-gray-500">
                        {sessions.length}回
                        {totalMinutes > 0 ? ` · ${formatDuration(totalMinutes)}` : ''}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 pb-2">
                  <div className="space-y-2">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800">{s.title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(s.scheduled_at).toLocaleDateString('ja-JP', {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short',
                            })}
                            {s.duration_minutes
                              ? ` · ${formatDuration(s.duration_minutes)}`
                              : ''}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-700 shrink-0 ml-3">
                          {s.fee != null ? formatYen(s.fee) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ===== 保護者ビュー =====
  const { data: rels } = await supabase
    .from('parent_student_relationships')
    .select('student_id')
    .eq('parent_id', user.id)

  const studentIds = rels?.map((r) => r.student_id) ?? []

  if (studentIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Receipt className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">お子さまの情報が登録されていません</p>
      </div>
    )
  }

  const { data: lecturesRaw } = await supabase
    .from('lectures')
    .select('*, profiles!lectures_student_id_fkey(full_name)')
    .in('student_id', studentIds)
    .eq('status', 'completed')
    .gte('scheduled_at', startOfMonth.toISOString())
    .lt('scheduled_at', endOfMonth.toISOString())
    .order('scheduled_at', { ascending: false })

  const lectures = lecturesRaw ?? []
  const totalFee = lectures.reduce((sum, l) => sum + (l.fee ?? 0), 0)
  const totalMinutes = lectures.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between">
        <Link
          href={`/billing?year=${prevMonth.year}&month=${prevMonth.month}`}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="text-center">
          <p className="font-bold text-gray-900">
            {year}年{month}月
          </p>
          {isCurrentMonth && (
            <span className="text-xs text-indigo-600">今月</span>
          )}
        </div>
        <Link
          href={
            isFuture
              ? '#'
              : `/billing?year=${nextMonth.year}&month=${nextMonth.month}`
          }
          className={`p-2 rounded-lg transition-colors ${
            isFuture ? 'opacity-30 pointer-events-none' : 'hover:bg-gray-100'
          }`}
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </Link>
      </div>

      {/* 請求額バナー */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-indigo-200 text-sm font-medium mb-1">
          {year}年{month}月 確定済み請求額
        </p>
        <p className="text-4xl font-bold">{formatYen(totalFee)}</p>
        <div className="flex items-center gap-4 mt-3 text-indigo-200 text-sm">
          <span>{lectures.length}回の授業</span>
          {totalMinutes > 0 && (
            <span>合計 {formatDuration(totalMinutes)}</span>
          )}
        </div>
      </div>

      {/* 授業タイムライン */}
      {lectures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">この月の完了した授業はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">授業レポート</h3>
          <div className="relative">
            {/* タイムライン縦線 */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-indigo-200" />

            <div className="space-y-4">
              {lectures.map((lecture) => (
                <div key={lecture.id} className="pl-10 relative">
                  {/* ドット */}
                  <div className="absolute left-[11px] top-4 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />

                  <Card className="border-gray-200">
                    <CardContent className="py-4 space-y-3">
                      {/* ヘッダー */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{lecture.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(lecture.scheduled_at).toLocaleDateString('ja-JP', {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {lecture.scheduled_end_at && (
                              <>
                                {' 〜 '}
                                {new Date(lecture.scheduled_end_at).toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </p>
                        </div>
                        {lecture.fee != null && (
                          <p className="text-sm font-bold text-indigo-700 shrink-0">
                            {formatYen(lecture.fee)}
                          </p>
                        )}
                      </div>

                      {/* 先生コメント */}
                      {lecture.teacher_comment && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                            <p className="text-xs font-semibold text-blue-700">
                              先生からのコメント
                            </p>
                          </div>
                          <p className="text-sm text-blue-800">{lecture.teacher_comment}</p>
                        </div>
                      )}

                      {/* 宿題 */}
                      {lecture.homework && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen className="h-3.5 w-3.5 text-amber-600" />
                            <p className="text-xs font-semibold text-amber-700">
                              宿題・次回の準備
                            </p>
                          </div>
                          <p className="text-sm text-amber-800">{lecture.homework}</p>
                        </div>
                      )}

                      {/* 指導時間 */}
                      {lecture.duration_minutes != null && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>指導時間：{formatDuration(lecture.duration_minutes)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
